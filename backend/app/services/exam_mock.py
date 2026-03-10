"""模考服务 — 组卷（passage_group 选题）+ 批改 + AI 报告。"""

import json
import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.exam import MockExam, ExamQuestion, ExamProfile
from app.services.cognitive_orchestrator import score_reflection_quality
from app.services.llm import chat_once_json, judge_answer

# 新高考全国卷 (gaokao) — 150分, 120分钟（去掉听力后 120分, ~100分钟）
GAOKAO_STRUCTURE = {
    "reading": {"count": 15, "score": 37.5, "time": 25, "passages": 4, "part": 1, "section_num": 1, "per_score": 2.5, "instruction": "阅读下列短文，从每题所给的A、B、C、D四个选项中选出最佳选项。"},
    "seven_choose_five": {"count": 5, "score": 12.5, "time": 10, "passages": 1, "part": 1, "section_num": 2, "per_score": 2.5, "instruction": "根据短文内容，从短文后的选项中选出能填入空白处的最佳选项。选项中有两项为多余选项。"},
    "cloze": {"count": 15, "score": 15, "time": 15, "passages": 1, "part": 2, "section_num": 1, "per_score": 1, "instruction": "阅读下面短文，从每题所给的A、B、C、D四个选项中选出可以填入空白处的最佳选项。"},
    "grammar_fill": {"count": 10, "score": 15, "time": 12, "passages": 1, "part": 2, "section_num": 2, "per_score": 1.5, "instruction": "阅读下面短文，在空白处填入1个适当的单词或括号内单词的正确形式。"},
    "application_writing": {"count": 1, "score": 15, "time": 15, "part": 3, "section_num": 1, "instruction": "假定你是李华，请根据题目要求写一封英文信。词数80左右。"},
    "continuation_writing": {"count": 1, "score": 25, "time": 25, "part": 3, "section_num": 2, "instruction": "阅读下面材料，根据其内容和所给段落开头语续写两段，使之构成一篇完整的短文。"},
}

# 中考通用卷 (zhongkao) — 120分, 120分钟（去掉听力后 ~90分, ~90分钟）
ZHONGKAO_STRUCTURE = {
    "single_choice": {"count": 10, "score": 10, "time": 8, "part": 1, "section_num": 1, "per_score": 1, "instruction": "从A、B、C、D四个选项中选出可以填入空白处的最佳选项。"},
    "cloze": {"count": 10, "score": 15, "time": 15, "passages": 1, "part": 1, "section_num": 2, "per_score": 1.5, "instruction": "阅读下面短文，从每题所给的A、B、C、D四个选项中选出最佳选项。"},
    "reading": {"count": 15, "score": 30, "time": 30, "passages": 4, "part": 2, "section_num": 1, "per_score": 2, "instruction": "阅读下列短文，从每题所给的A、B、C、D四个选项中选出最佳选项。"},
    "grammar_fill": {"count": 10, "score": 15, "time": 12, "passages": 1, "part": 2, "section_num": 2, "per_score": 1.5, "instruction": "阅读下面短文，在空白处填入1个适当的单词或括号内单词的正确形式。"},
    "writing": {"count": 1, "score": 20, "time": 25, "part": 3, "section_num": 1, "instruction": "根据要求完成短文写作。"},
}

SECTION_LABELS = {
    "listening": "听力理解",
    "reading": "阅读理解",
    "seven_choose_five": "七选五",
    "cloze": "完形填空",
    "grammar_fill": "语法填空",
    "single_choice": "单项选择",
    "error_correction": "短文改错",
    "writing": "书面表达",
    "application_writing": "应用文写作",
    "continuation_writing": "读后续写",
}


async def _pick_passage_groups(
    exam_type: str, section: str, n_passages: int, db: AsyncSession
) -> list[str]:
    """随机选取 n 个不同的 passage_group。"""
    result = await db.execute(
        select(ExamQuestion.passage_group)
        .where(
            ExamQuestion.exam_type == exam_type,
            ExamQuestion.section == section,
            ExamQuestion.passage_group.isnot(None),
        )
        .group_by(ExamQuestion.passage_group)
        .order_by(func.random())
        .limit(n_passages)
    )
    return [row[0] for row in result.all()]


async def _get_questions_by_groups(
    exam_type: str, section: str, groups: list[str], db: AsyncSession
) -> list[ExamQuestion]:
    """获取指定 passage_group 的所有题目，按 passage_index 排序。"""
    if not groups:
        return []
    result = await db.execute(
        select(ExamQuestion)
        .where(
            ExamQuestion.exam_type == exam_type,
            ExamQuestion.section == section,
            ExamQuestion.passage_group.in_(groups),
        )
        .order_by(ExamQuestion.passage_group, ExamQuestion.passage_index)
    )
    return list(result.scalars().all())


async def _pick_individual_questions(
    exam_type: str, section: str, count: int, exclude_ids: list[int], db: AsyncSession
) -> list[ExamQuestion]:
    """随机选取单独题目（非篇章类 section 或补足数量）。"""
    if count <= 0:
        return []
    where_clauses = [
        ExamQuestion.exam_type == exam_type,
        ExamQuestion.section == section,
    ]
    if exclude_ids:
        where_clauses.append(ExamQuestion.id.notin_(exclude_ids))

    result = await db.execute(
        select(ExamQuestion)
        .where(*where_clauses)
        .order_by(func.random())
        .limit(count)
    )
    return list(result.scalars().all())


def _format_question(q: ExamQuestion) -> dict:
    return {
        "id": q.id,
        "content": q.content,
        "options": json.loads(q.options_json) if q.options_json else [],
        "passage_text": q.passage_text,
        "difficulty": q.difficulty,
        "passage_group": q.passage_group,
        "passage_index": q.passage_index,
    }


async def start_mock(user_id: int, exam_type: str | None, db: AsyncSession) -> dict:
    """组卷并开始模考。reading/cloze 按 passage_group 整组选取。"""
    if not exam_type:
        profile_result = await db.execute(
            select(ExamProfile).where(ExamProfile.user_id == user_id)
        )
        profile = profile_result.scalar_one_or_none()
        exam_type = profile.exam_type if profile else "gaokao"

    structure = GAOKAO_STRUCTURE if exam_type == "gaokao" else ZHONGKAO_STRUCTURE
    time_limit = sum(s["time"] for s in structure.values())

    sections_data = []
    for section, cfg in structure.items():
        count = cfg["count"]
        questions: list[ExamQuestion] = []

        if "passages" in cfg:
            # 篇章类 section：先选 passage_group，再取组内题目
            groups = await _pick_passage_groups(exam_type, section, cfg["passages"], db)
            if groups:
                questions = await _get_questions_by_groups(exam_type, section, groups, db)

            # 如果篇章题不够，用散题补足
            if len(questions) < count:
                extra = await _pick_individual_questions(
                    exam_type, section, count - len(questions),
                    [q.id for q in questions], db,
                )
                questions.extend(extra)
        else:
            # 非篇章类：直接随机选题
            questions = await _pick_individual_questions(exam_type, section, count, [], db)

        # 截断到目标数量
        questions = questions[:count]

        # 按 passage_group 分组输出
        passage_groups = []
        current_group = None
        current_group_questions = []
        for q in questions:
            if q.passage_group and q.passage_group == current_group:
                current_group_questions.append(_format_question(q))
            else:
                if current_group_questions:
                    passage_groups.append({
                        "group_id": current_group,
                        "questions": current_group_questions,
                    })
                current_group = q.passage_group
                current_group_questions = [_format_question(q)]
        if current_group_questions:
            passage_groups.append({
                "group_id": current_group,
                "questions": current_group_questions,
            })

        sections_data.append({
            "section": section,
            "label": SECTION_LABELS.get(section, section),
            "score": cfg["score"],
            "time_limit": cfg["time"],
            "question_count": len(questions),
            "part": cfg.get("part"),
            "section_num": cfg.get("section_num"),
            "instruction": cfg.get("instruction", ""),
            "per_score": cfg.get("per_score"),
            "passage_groups": passage_groups,
            "questions": [_format_question(q) for q in questions],
        })

    mock = MockExam(
        user_id=user_id,
        exam_type=exam_type,
        time_limit_minutes=time_limit,
        sections_json=json.dumps(sections_data, ensure_ascii=False),
    )
    db.add(mock)
    await db.flush()

    return {
        "mock_id": mock.id,
        "exam_type": exam_type,
        "time_limit_minutes": time_limit,
        "sections": sections_data,
    }


async def submit_mock(user_id: int, mock_id: int, answers: list[dict], db: AsyncSession) -> dict:
    """提交模考答案，批改并生成报告。"""
    result = await db.execute(
        select(MockExam).where(MockExam.id == mock_id, MockExam.user_id == user_id)
    )
    mock = result.scalar_one_or_none()
    if not mock or mock.status != "in_progress":
        return {"error": "模考不存在或已完成"}

    sections = json.loads(mock.sections_json)
    answer_payload_map = {a["question_id"]: a for a in answers}
    answer_map = {qid: payload.get("answer", "") for qid, payload in answer_payload_map.items()}

    section_scores = {}
    total_score = 0
    max_score = 0
    graded_answers = []

    for sec in sections:
        section_name = sec["section"]
        sec_score = 0
        sec_max = sec["score"]
        max_score += sec_max
        per_q_score = sec.get("per_score") or (sec_max / max(len(sec["questions"]), 1))

        for q_data in sec["questions"]:
            qid = q_data["id"]
            student_answer = str(answer_map.get(qid, "") or "")
            time_spent = int((answer_payload_map.get(qid) or {}).get("time_spent") or 0)

            q_result = await db.execute(select(ExamQuestion).where(ExamQuestion.id == qid))
            question = q_result.scalar_one_or_none()
            if not question:
                continue

            is_correct = False
            if question.options_json:
                is_correct = student_answer.strip().upper() == question.answer.strip().upper()
            elif student_answer:
                judge_result = await judge_answer(question.content, question.answer, student_answer)
                is_correct = judge_result.get("is_correct", False)

            earned = per_q_score if is_correct else 0
            sec_score += earned

            graded_answers.append({
                "question_id": qid,
                "student_answer": student_answer,
                "correct_answer": question.answer,
                "is_correct": is_correct,
                "score": round(earned, 1),
                "section": section_name,
                "passage_group": q_data.get("passage_group"),
                "time_spent": time_spent,
                "content": question.content,
                "explanation": question.explanation,
            })

            if question.knowledge_point_id:
                await _update_mastery_simple(user_id, question.knowledge_point_id, is_correct, db)

        section_scores[section_name] = {
            "label": SECTION_LABELS.get(section_name, section_name),
            "score": round(sec_score, 1),
            "max": sec_max,
            "accuracy": round(sum(1 for a in graded_answers if a["section"] == section_name and a["is_correct"]) / max(len(sec["questions"]), 1), 2),
        }
        total_score += sec_score

    score_data = {
        "total": round(total_score, 1),
        "max": max_score,
        "sections": section_scores,
    }

    # AI 报告
    ai_report = await _generate_ai_report(exam_type=mock.exam_type, score_data=score_data, graded_answers=graded_answers)
    wrong_questions = _build_wrong_questions(graded_answers)
    review_tasks = [
        {
            "question_id": w["question_id"],
            "section": w["section"],
            "content": w["content"],
            "student_answer": w["student_answer"],
            "correct_answer": w["correct_answer"],
            "explanation": w["explanation"],
            "review_prompt": "请解释你当时为什么会这样选，并指出下次如何避免同类错误。",
            "review_status": "pending",
        }
        for w in wrong_questions
    ]
    cognitive_offload_risk = _estimate_cognitive_offload_risk(score_data, graded_answers)
    ai_report["cognitive_offload_risk"] = cognitive_offload_risk
    ai_report["review_tasks"] = review_tasks
    ai_report["review_records"] = {}
    ai_report["review_progress"] = {"completed": 0, "total": len(review_tasks), "rate": 0.0}

    mock.status = "completed"
    mock.answers_json = json.dumps(graded_answers, ensure_ascii=False)
    mock.score_json = json.dumps(score_data, ensure_ascii=False)
    mock.ai_report_json = json.dumps(ai_report, ensure_ascii=False)
    mock.completed_at = datetime.datetime.now(datetime.timezone.utc)
    await db.flush()

    return {
        "mock_id": mock.id,
        "score": score_data,
        "answers": graded_answers,
        "ai_report": ai_report,
        "wrong_questions": wrong_questions,
        "review_tasks": review_tasks,
        "cognitive_offload_risk": cognitive_offload_risk,
    }


async def _generate_ai_report(exam_type: str, score_data: dict, graded_answers: list[dict]) -> dict:
    """调用 LLM 生成模考分析报告。"""
    sections_summary = []
    for sec_name, sec_info in score_data["sections"].items():
        sections_summary.append(f"{sec_info['label']}: {sec_info['score']}/{sec_info['max']} (正确率 {sec_info['accuracy']*100:.0f}%)")

    wrong_sections = []
    for a in graded_answers:
        if not a["is_correct"]:
            wrong_sections.append(a["section"])

    from collections import Counter
    wrong_dist = Counter(wrong_sections)

    user_prompt = f"""请根据以下模考成绩生成简洁的分析报告。

考试类型: {"高考" if exam_type == "gaokao" else "中考"}
总分: {score_data['total']}/{score_data['max']}
各部分成绩:
{chr(10).join(sections_summary)}

错题分布: {dict(wrong_dist)}

请返回 JSON 格式:
{{
  "overall_comment": "总体评价（1-2句）",
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["薄弱点1", "薄弱点2"],
  "suggestions": ["建议1", "建议2", "建议3"],
  "estimated_rank": "预估排名区间（如前30%）"
}}"""

    try:
        report = await chat_once_json(
            "你是一位资深英语考试分析师，请返回简洁、可执行的中文报告。",
            user_prompt,
        )
        return report if isinstance(report, dict) else {"overall_comment": "报告生成失败", "strengths": [], "weaknesses": [], "suggestions": [], "estimated_rank": "N/A"}
    except Exception:
        return {
            "overall_comment": f"总分 {score_data['total']}/{score_data['max']}",
            "strengths": [], "weaknesses": [], "suggestions": ["继续练习薄弱环节"],
            "estimated_rank": "N/A",
        }


def _build_wrong_questions(graded_answers: list[dict]) -> list[dict]:
    wrong = [
        {
            "question_id": a["question_id"],
            "section": a["section"],
            "content": a.get("content", ""),
            "student_answer": a.get("student_answer", ""),
            "correct_answer": a.get("correct_answer", ""),
            "explanation": a.get("explanation", ""),
        }
        for a in graded_answers
        if not a.get("is_correct")
    ]
    return wrong[:8]


def _estimate_cognitive_offload_risk(score_data: dict, graded_answers: list[dict]) -> dict:
    total = max(len(graded_answers), 1)
    answered = sum(1 for a in graded_answers if str(a.get("student_answer", "")).strip())
    empty_rate = max(0.0, min(1.0, (total - answered) / total))
    accuracy = max(0.0, min(1.0, score_data.get("total", 0) / max(score_data.get("max", 1), 1)))

    non_zero_times = [int(a.get("time_spent", 0)) for a in graded_answers if int(a.get("time_spent", 0)) > 0]
    fast_submit_rate = 0.0
    if non_zero_times:
        fast_submit_rate = sum(1 for t in non_zero_times if t <= 8) / len(non_zero_times)

    risk_score = round(min(100.0, empty_rate * 55 + (1 - accuracy) * 35 + fast_submit_rate * 10), 1)
    if risk_score >= 70:
        level = "high"
    elif risk_score >= 40:
        level = "medium"
    else:
        level = "low"

    reasons = []
    if empty_rate >= 0.25:
        reasons.append("空白题比例偏高，独立作答完整性不足。")
    if accuracy <= 0.45:
        reasons.append("总体正确率偏低，可能存在思路断点。")
    if fast_submit_rate >= 0.5:
        reasons.append("作答过快比例偏高，可能存在浅层判断。")
    if not reasons:
        reasons.append("本次作答整体稳定，认知卸载风险可控。")

    return {
        "score": risk_score,
        "level": level,
        "empty_rate": round(empty_rate, 2),
        "accuracy": round(accuracy, 2),
        "fast_submit_rate": round(fast_submit_rate, 2),
        "reasons": reasons,
    }


async def submit_mock_review(
    user_id: int,
    mock_id: int,
    question_id: int,
    reflection_text: str,
    db: AsyncSession,
) -> dict:
    result = await db.execute(
        select(MockExam).where(MockExam.id == mock_id, MockExam.user_id == user_id)
    )
    mock = result.scalar_one_or_none()
    if not mock or mock.status != "completed":
        return {"error": "模考不存在或尚未完成"}

    reflection = (reflection_text or "").strip()
    if not reflection:
        return {"error": "复盘内容不能为空"}

    graded_answers = json.loads(mock.answers_json) if mock.answers_json else []
    target = next((a for a in graded_answers if a.get("question_id") == question_id), None)
    if not target:
        return {"error": "题目不存在"}
    if target.get("is_correct"):
        return {"error": "请优先复盘错题"}

    quality = score_reflection_quality(reflection)
    feedback = await _generate_review_feedback(target, reflection, quality)

    report = json.loads(mock.ai_report_json) if mock.ai_report_json else {}
    if not isinstance(report, dict):
        report = {}

    review_records = report.get("review_records")
    if not isinstance(review_records, dict):
        review_records = {}
    review_records[str(question_id)] = {
        "question_id": question_id,
        "reflection_text": reflection,
        "reflection_quality": quality,
        "feedback": feedback,
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    report["review_records"] = review_records

    review_tasks = report.get("review_tasks")
    if isinstance(review_tasks, list):
        for item in review_tasks:
            if item.get("question_id") == question_id:
                item["review_status"] = "completed"
                item["reflection_quality"] = quality
        completed = sum(1 for item in review_tasks if item.get("review_status") == "completed")
        total = len(review_tasks)
        report["review_progress"] = {
            "completed": completed,
            "total": total,
            "rate": round(completed / max(total, 1), 2),
        }

    mock.ai_report_json = json.dumps(report, ensure_ascii=False)
    await db.flush()

    return {
        "mock_id": mock_id,
        "question_id": question_id,
        "reflection_quality": quality,
        "feedback": feedback,
        "review_progress": report.get("review_progress"),
    }


async def _generate_review_feedback(target: dict, reflection_text: str, quality: float) -> dict:
    system_prompt = (
        "你是一位英语考试复盘教练。你要先认可学生的思考，再指出一个关键认知偏差，"
        "最后给出一个下一题可执行动作。仅返回 JSON。"
    )
    user_prompt = f"""错题信息：
题目：{target.get("content", "")}
学生答案：{target.get("student_answer", "")}
正确答案：{target.get("correct_answer", "")}
解析：{target.get("explanation", "")}

学生复盘：
{reflection_text}

复盘质量分（0-1）：{quality}

请返回 JSON：
{{
  "coach_reply": "教练反馈（2-3句）",
  "bias": "本题关键思维偏差",
  "next_action": "下次答题的一个具体动作",
  "counter_example": "一个可用于自检的反例提问"
}}"""

    try:
        result = await chat_once_json(system_prompt, user_prompt)
        if isinstance(result, dict):
            return result
    except Exception:
        pass

    return {
        "coach_reply": "你的复盘方向是对的。下次先写出排除依据，再做最终选择。",
        "bias": "过早锁定答案，缺少反证检查。",
        "next_action": "每道错题至少写出一个“为什么另一个选项错”的证据。",
        "counter_example": "如果把你选的选项替换进原文，是否会产生语义或语法冲突？",
    }


async def get_mock_result(user_id: int, mock_id: int, db: AsyncSession) -> dict | None:
    result = await db.execute(
        select(MockExam).where(MockExam.id == mock_id, MockExam.user_id == user_id)
    )
    mock = result.scalar_one_or_none()
    if not mock:
        return None
    return {
        "id": mock.id, "exam_type": mock.exam_type, "status": mock.status,
        "time_limit_minutes": mock.time_limit_minutes,
        "sections_json": json.loads(mock.sections_json) if mock.sections_json else None,
        "answers_json": json.loads(mock.answers_json) if mock.answers_json else None,
        "score_json": json.loads(mock.score_json) if mock.score_json else None,
        "ai_report_json": json.loads(mock.ai_report_json) if mock.ai_report_json else None,
        "started_at": mock.started_at.isoformat() if mock.started_at else "",
        "completed_at": mock.completed_at.isoformat() if mock.completed_at else None,
    }


async def get_mock_history(user_id: int, db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(MockExam)
        .where(MockExam.user_id == user_id)
        .order_by(MockExam.started_at.desc())
        .limit(20)
    )
    mocks = []
    for m in result.scalars().all():
        score = json.loads(m.score_json) if m.score_json else None
        mocks.append({
            "id": m.id, "exam_type": m.exam_type, "status": m.status,
            "total_score": score["total"] if score else None,
            "max_score": score["max"] if score else None,
            "started_at": m.started_at.isoformat() if m.started_at else "",
            "completed_at": m.completed_at.isoformat() if m.completed_at else None,
        })
    return mocks


async def _update_mastery_simple(user_id: int, kp_id: int, is_correct: bool, db: AsyncSession):
    from app.services.exam_diagnostic import _update_mastery
    await _update_mastery(user_id, kp_id, is_correct, db)
