"""诊断测试服务 — 从题库抽取诊断题 + 深度分析 + 冲刺计划。"""

import json
import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.exam import (
    DiagnosticSession, ExamKnowledgePoint, KnowledgeMastery, ExamProfile,
    ExamQuestion,
)
from app.services.llm import chat_once_json, judge_answer

SECTION_LABELS = {
    "listening": "听力理解",
    "reading": "阅读理解",
    "cloze": "完形填空",
    "grammar_fill": "语法填空",
    "error_correction": "短文改错",
    "writing": "书面表达",
}

ZHONGKAO_SECTIONS = ["reading", "cloze", "grammar_fill", "writing"]
GAOKAO_SECTIONS = ["reading", "cloze", "grammar_fill", "error_correction", "writing"]


def _sections_for(exam_type: str) -> list[str]:
    return GAOKAO_SECTIONS if exam_type == "gaokao" else ZHONGKAO_SECTIONS


async def start_diagnostic(user_id: int, exam_type: str, db: AsyncSession) -> dict:
    """优先从题库抽取 40 道诊断题，LLM 生成作为 fallback。"""
    sections = _sections_for(exam_type)
    questions_per_section = max(4, 40 // len(sections))

    # 优先从题库抽取
    questions = await _questions_from_bank(exam_type, sections, questions_per_section, db)

    if len(questions) < 20:
        # 题库不足，fallback 到 LLM 生成
        questions = await _questions_from_llm(exam_type, sections, questions_per_section, db)

    session = DiagnosticSession(
        user_id=user_id,
        exam_type=exam_type,
        status="in_progress",
        questions_json=json.dumps(questions, ensure_ascii=False),
    )
    db.add(session)
    await db.flush()

    return {
        "session_id": session.id,
        "questions": questions,
        "total": len(questions),
    }


async def _questions_from_bank(
    exam_type: str, sections: list[str], per_section: int, db: AsyncSession
) -> list[dict]:
    """从 ExamQuestion 题库中按 section 均匀抽取，难度从易到难。"""
    questions = []
    for sec in sections:
        result = await db.execute(
            select(ExamQuestion)
            .where(ExamQuestion.exam_type == exam_type, ExamQuestion.section == sec)
            .order_by(ExamQuestion.difficulty, func.random())
            .limit(per_section)
        )
        for q in result.scalars().all():
            questions.append({
                "section": sec,
                "question": q.content,
                "options": json.loads(q.options_json) if q.options_json else [],
                "answer": q.answer,
                "explanation": q.explanation,
                "difficulty": q.difficulty,
                "knowledge_point_id": q.knowledge_point_id,
                "question_id": q.id,
            })
    return questions


async def _questions_from_llm(
    exam_type: str, sections: list[str], per_section: int, db: AsyncSession
) -> list[dict]:
    """LLM 生成诊断题（fallback）。"""
    result = await db.execute(
        select(ExamKnowledgePoint)
        .where(ExamKnowledgePoint.exam_type == exam_type)
        .order_by(ExamKnowledgePoint.section, ExamKnowledgePoint.id)
    )
    kps = result.scalars().all()
    kp_summary = {}
    for kp in kps:
        kp_summary.setdefault(kp.section, []).append(
            {"id": kp.id, "name": kp.name, "category": kp.category, "difficulty": kp.difficulty}
        )

    exam_label = "中考" if exam_type == "zhongkao" else "高考"

    system_prompt = f"""你是一位资深英语教师，专门辅导中国学生备考{exam_label}英语。
现在需要生成一套诊断测试题，用于评估学生各维度的英语水平。

要求：
- 总共生成 {per_section * len(sections)} 道题
- 覆盖以下题型：{', '.join(SECTION_LABELS[s] for s in sections)}
- 每个题型 {per_section} 道，难度从易到难递进（1-5级）
- 每道题标注对应的知识点 ID（从提供的知识点列表中选择）
- 选择题提供 4 个选项 A/B/C/D
- 书面表达题给出写作话题和要求

返回 JSON 数组，每个元素格式：
{{"section": "题型", "question": "题目内容", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "正确答案", "difficulty": 1-5, "knowledge_point_id": 知识点ID}}
对于书面表达，options 为空数组，answer 为评分要点。"""

    user_prompt = f"知识点列表：\n{json.dumps(kp_summary, ensure_ascii=False)}\n\n请生成诊断测试题。"

    try:
        questions = await chat_once_json(system_prompt, user_prompt)
        if isinstance(questions, dict) and "questions" in questions:
            questions = questions["questions"]
        return questions
    except Exception:
        return []


async def submit_diagnostic(session_id: int, answers: list[dict], user_id: int, db: AsyncSession) -> dict:
    """批改诊断测试 + LLM 生成深度分析。"""
    result = await db.execute(
        select(DiagnosticSession)
        .where(DiagnosticSession.id == session_id, DiagnosticSession.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        return {"error": "诊断会话不存在"}
    if session.status == "completed":
        return {"error": "诊断已完成"}

    questions = json.loads(session.questions_json) if session.questions_json else []

    # 批改
    total_score = 0
    max_score = len(questions)
    section_scores: dict[str, dict] = {}
    graded_answers = []

    for ans in answers:
        idx = ans.get("index", 0)
        if idx >= len(questions):
            continue
        q = questions[idx]
        student_answer = str(ans.get("student_answer", "")).strip()
        correct_answer = str(q.get("answer", "")).strip()

        # 智能判题：有选项的用字母比较，其余用 LLM
        options = q.get("options", [])
        judge_explanation = ""
        if options:
            is_correct = student_answer.upper()[:1] == correct_answer.upper()[:1] if correct_answer else False
        elif student_answer:
            try:
                judge_result = await judge_answer(
                    q.get("question", ""), correct_answer, student_answer
                )
                is_correct = judge_result["is_correct"]
                judge_explanation = judge_result.get("explanation", "")
            except Exception:
                is_correct = False
        else:
            is_correct = False

        if is_correct:
            total_score += 1

        sec = q.get("section", "unknown")
        if sec not in section_scores:
            section_scores[sec] = {"correct": 0, "total": 0}
        section_scores[sec]["total"] += 1
        if is_correct:
            section_scores[sec]["correct"] += 1

        graded_answers.append({
            "index": idx,
            "student_answer": student_answer,
            "is_correct": is_correct,
            "judge_explanation": judge_explanation,
            "time_spent_seconds": ans.get("time_spent_seconds", 0),
        })

    # 更新知识点掌握度
    for i, ans in enumerate(graded_answers):
        if i < len(questions):
            kp_id = questions[i].get("knowledge_point_id")
            if kp_id:
                await _update_mastery(user_id, kp_id, ans["is_correct"], db)

    # 识别薄弱点和强项
    weak_points = []
    strong_points = []
    for sec, scores in section_scores.items():
        rate = scores["correct"] / scores["total"] if scores["total"] > 0 else 0
        if rate < 0.6:
            weak_points.append({"section": sec, "label": SECTION_LABELS.get(sec, sec), "rate": rate})
        elif rate >= 0.8:
            strong_points.append({"section": sec, "label": SECTION_LABELS.get(sec, sec), "rate": rate})

    result_data = {
        "total_score": total_score,
        "max_score": max_score,
        "score_rate": round(total_score / max_score, 2) if max_score > 0 else 0,
        "section_scores": {
            sec: {"correct": s["correct"], "total": s["total"],
                  "rate": round(s["correct"] / s["total"], 2) if s["total"] > 0 else 0}
            for sec, s in section_scores.items()
        },
        "weak_points": weak_points,
        "strong_points": strong_points,
    }

    # LLM 深度分析
    exam_label = "中考" if session.exam_type == "zhongkao" else "高考"
    analysis_prompt = f"""你是一位资深英语教师，专门辅导中国学生备考{exam_label}。
根据学生的诊断测试结果，生成详细的分析报告。

学生答题数据：{json.dumps(result_data, ensure_ascii=False)}
题目详情：{session.questions_json}
学生答案：{json.dumps(graded_answers, ensure_ascii=False)}

请分析：
1. 各题型得分率和薄弱环节
2. 具体薄弱知识点（精确到语法规则/词汇类别）
3. 中文母语迁移导致的典型错误
4. 学习优先级排序（投入产出比最高的突破点）
5. 预估当前分数（满分150）

返回 JSON：
{{"summary": "总体评价", "estimated_score": 数字, "section_analysis": {{"section": "分析"}}, "weak_knowledge_points": ["知识点"], "mother_tongue_issues": ["问题"], "priority_actions": ["行动"], "encouragement": "鼓励语"}}"""

    try:
        ai_analysis = await chat_once_json(analysis_prompt, "请生成分析报告。")
    except Exception:
        ai_analysis = {
            "summary": f"诊断完成，总得分率 {result_data['score_rate']*100:.0f}%",
            "estimated_score": int(result_data["score_rate"] * 150),
            "section_analysis": {},
            "weak_knowledge_points": [w["label"] for w in weak_points],
            "priority_actions": ["加强薄弱题型训练"],
            "encouragement": "继续努力，你一定可以达到目标！",
        }

    # 更新 ExamProfile 预估分
    estimated = ai_analysis.get("estimated_score", int(result_data["score_rate"] * 150))
    profile_result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    if profile:
        profile.current_estimated_score = estimated

    session.answers_json = json.dumps(graded_answers, ensure_ascii=False)
    session.result_json = json.dumps(result_data, ensure_ascii=False)
    session.ai_analysis_json = json.dumps(ai_analysis, ensure_ascii=False)
    session.status = "completed"
    session.completed_at = datetime.datetime.now(datetime.timezone.utc)
    await db.flush()

    return {
        "session_id": session.id,
        "result": result_data,
        "ai_analysis": ai_analysis,
    }


async def get_diagnostic_result(session_id: int, user_id: int, db: AsyncSession) -> dict | None:
    result = await db.execute(
        select(DiagnosticSession)
        .where(DiagnosticSession.id == session_id, DiagnosticSession.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        return None
    return {
        "id": session.id,
        "exam_type": session.exam_type,
        "status": session.status,
        "questions_json": json.loads(session.questions_json) if session.questions_json else None,
        "answers_json": json.loads(session.answers_json) if session.answers_json else None,
        "result_json": json.loads(session.result_json) if session.result_json else None,
        "ai_analysis_json": json.loads(session.ai_analysis_json) if session.ai_analysis_json else None,
    }


async def generate_plan(session_id: int, user_id: int, db: AsyncSession) -> dict:
    """根据诊断结果生成冲刺计划。"""
    result = await db.execute(
        select(DiagnosticSession)
        .where(DiagnosticSession.id == session_id, DiagnosticSession.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        return {"error": "诊断会话不存在"}
    if session.status != "completed":
        return {"error": "请先完成诊断测试"}

    result_data = json.loads(session.result_json) if session.result_json else {}
    ai_analysis = json.loads(session.ai_analysis_json) if session.ai_analysis_json else {}

    # 获取用户档案
    profile_result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    target_score = profile.target_score if profile else 140
    exam_date = profile.exam_date if profile else ""
    exam_type = session.exam_type
    exam_label = "中考" if exam_type == "zhongkao" else "高考"

    plan_prompt = f"""你是一位资深英语教师，专门辅导中国学生备考{exam_label}。
根据学生的诊断结果，生成个性化的冲刺复习计划。

诊断结果：{json.dumps(result_data, ensure_ascii=False)}
AI 分析：{json.dumps(ai_analysis, ensure_ascii=False)}
目标分数：{target_score}
考试日期：{exam_date}

请生成冲刺计划，返回 JSON：
{{"plan_name": "计划名称", "total_days": 天数, "daily_hours": 建议每日学习时长,
"phases": [{{"phase": 1, "name": "阶段名", "days": 天数, "focus": ["重点"], "daily_tasks": ["每日任务"]}}],
"weekly_goals": ["每周目标"],
"priority_sections": ["优先突破的题型"],
"estimated_improvement": 预计提分}}"""

    try:
        plan = await chat_once_json(plan_prompt, "请生成冲刺计划。")
    except Exception:
        plan = {
            "plan_name": f"{exam_label}英语冲刺计划",
            "total_days": 30,
            "daily_hours": 2,
            "phases": [
                {"phase": 1, "name": "基础巩固", "days": 10, "focus": ["薄弱知识点"], "daily_tasks": ["专项训练"]},
                {"phase": 2, "name": "强化提升", "days": 10, "focus": ["重点题型"], "daily_tasks": ["模考练习"]},
                {"phase": 3, "name": "冲刺模考", "days": 10, "focus": ["全真模拟"], "daily_tasks": ["限时模考"]},
            ],
            "weekly_goals": ["完成各题型专项训练"],
            "priority_sections": [w["label"] for w in result_data.get("weak_points", [])],
            "estimated_improvement": 15,
        }

    # 保存到用户档案
    if profile:
        profile.plan_json = json.dumps(plan, ensure_ascii=False)
        await db.flush()

    return {"session_id": session_id, "plan": plan}


async def _update_mastery(user_id: int, kp_id: int, is_correct: bool, db: AsyncSession):
    """更新知识点掌握度。"""
    result = await db.execute(
        select(KnowledgeMastery)
        .where(KnowledgeMastery.user_id == user_id, KnowledgeMastery.knowledge_point_id == kp_id)
    )
    mastery = result.scalar_one_or_none()
    now = datetime.datetime.now(datetime.timezone.utc)

    if not mastery:
        mastery = KnowledgeMastery(
            user_id=user_id,
            knowledge_point_id=kp_id,
            mastery_level=0.3 if is_correct else 0.0,
            total_attempts=1,
            correct_attempts=1 if is_correct else 0,
            last_practiced_at=now,
        )
        db.add(mastery)
    else:
        alpha = 0.3
        new_val = mastery.mastery_level * (1 - alpha) + (1.0 if is_correct else 0.0) * alpha
        if mastery.last_practiced_at:
            days_since = (now - mastery.last_practiced_at).days
            decay = max(0.9, 1.0 - days_since * 0.01)
            new_val *= decay
        mastery.mastery_level = min(1.0, max(0.0, new_val))
        mastery.total_attempts += 1
        if is_correct:
            mastery.correct_attempts += 1
        mastery.last_practiced_at = now

    await db.flush()
