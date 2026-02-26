"""模考服务 — 组卷（passage_group 选题）+ 批改 + AI 报告。"""

import json
import datetime
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.exam import MockExam, ExamQuestion, ExamProfile, KnowledgeMastery, ExamKnowledgePoint
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
    answer_map = {a["question_id"]: a["answer"] for a in answers}

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
            student_answer = answer_map.get(qid, "")

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

    prompt = f"""你是一位资深英语考试分析师。请根据以下模考成绩生成简洁的分析报告。

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
        report = await chat_once_json(prompt)
        return report if isinstance(report, dict) else {"overall_comment": "报告生成失败", "strengths": [], "weaknesses": [], "suggestions": [], "estimated_rank": "N/A"}
    except Exception:
        return {
            "overall_comment": f"总分 {score_data['total']}/{score_data['max']}",
            "strengths": [], "weaknesses": [], "suggestions": ["继续练习薄弱环节"],
            "estimated_rank": "N/A",
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
