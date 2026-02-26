"""心流刷题服务 — 沉浸式连击刷题模式。"""

import json
import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.exam import FlowSession, ExamQuestion, ExamProfile, ExamKnowledgePoint, KnowledgeMastery
from app.services.llm import judge_answer


def _streak_to_difficulty(streak: int) -> int:
    """连击数映射到难度：越高越难。"""
    if streak < 3:
        return 2
    elif streak < 7:
        return 3
    elif streak < 15:
        return 4
    else:
        return 5


async def start_flow(user_id: int, section: str, db: AsyncSession) -> dict:
    """开始一次心流刷题 session。"""
    profile_result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    exam_type = profile.exam_type if profile else "zhongkao"

    session = FlowSession(
        user_id=user_id,
        exam_type=exam_type,
        section=section,
        current_difficulty=2,
        difficulty_curve_json="[]",
    )
    db.add(session)
    await db.flush()

    question = await _pick_question(user_id, exam_type, section, 2, db)

    return {
        "session_id": session.id,
        "streak": 0,
        "difficulty": 2,
        "question": question,
    }


async def submit_flow_answer(
    user_id: int, session_id: int, question_id: int, answer: str, response_ms: int, db: AsyncSession
) -> dict:
    """提交心流答案，返回结果和下一题。"""
    result = await db.execute(
        select(FlowSession).where(FlowSession.id == session_id, FlowSession.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if not session or session.status != "active":
        return {"error": "session not found or already completed"}

    # 获取题目
    q_result = await db.execute(select(ExamQuestion).where(ExamQuestion.id == question_id))
    question = q_result.scalar_one_or_none()
    if not question:
        return {"error": "question not found"}

    # 判题：选择题精确匹配，主观题调 LLM
    is_correct = False
    correct_answer = question.answer
    explanation = ""

    if question.options_json:
        # 选择题：直接比较
        is_correct = answer.strip().upper() == correct_answer.strip().upper()
        explanation = question.explanation or ""
    else:
        # 主观题：调 LLM
        judge_result = await judge_answer(question.content, correct_answer, answer)
        is_correct = judge_result["is_correct"]
        correct_answer = judge_result["correct_answer"]
        explanation = judge_result["explanation"]

    # 更新 session
    session.total_questions += 1
    old_streak = session.current_streak

    if is_correct:
        session.correct_count += 1
        session.current_streak += 1
        if session.current_streak > session.max_streak:
            session.max_streak = session.current_streak
    else:
        session.current_streak = 0

    # 更新难度
    new_difficulty = _streak_to_difficulty(session.current_streak)
    session.current_difficulty = new_difficulty

    # 记录难度曲线
    curve = json.loads(session.difficulty_curve_json or "[]")
    curve.append({"q": session.total_questions, "d": new_difficulty, "correct": is_correct})
    session.difficulty_curve_json = json.dumps(curve)

    # 更新平均响应时间
    if session.total_questions == 1:
        session.avg_response_ms = response_ms
    else:
        session.avg_response_ms = int(
            (session.avg_response_ms * (session.total_questions - 1) + response_ms) / session.total_questions
        )

    # 更新知识点掌握度
    if question.knowledge_point_id:
        await _update_mastery(user_id, question.knowledge_point_id, is_correct, db)

    # 计算本题 XP
    base_xp = 5
    streak_bonus = int(session.current_streak * 0.5) if is_correct else 0
    milestone_bonus = 0
    milestone = None
    if is_correct and session.current_streak in (5, 10, 20, 50, 100):
        milestone_bonus = session.current_streak
        milestone = session.current_streak
    question_xp = base_xp + streak_bonus + milestone_bonus
    session.xp_earned += question_xp

    await db.flush()

    # 获取下一题
    next_question = await _pick_question(user_id, session.exam_type, session.section, new_difficulty, db)

    return {
        "is_correct": is_correct,
        "correct_answer": correct_answer,
        "explanation": explanation[:100] if explanation else "",
        "streak": session.current_streak,
        "max_streak": session.max_streak,
        "difficulty": new_difficulty,
        "xp_gained": question_xp,
        "milestone": milestone,
        "next_question": next_question,
    }


async def end_flow(user_id: int, session_id: int, db: AsyncSession) -> dict:
    """结束心流 session，生成战报。"""
    result = await db.execute(
        select(FlowSession).where(FlowSession.id == session_id, FlowSession.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        return {"error": "session not found"}

    session.status = "completed"
    session.completed_at = datetime.datetime.now(datetime.timezone.utc)
    await db.flush()

    accuracy = round(session.correct_count / max(session.total_questions, 1) * 100, 1)
    duration_seconds = 0
    if session.started_at and session.completed_at:
        duration_seconds = int((session.completed_at - session.started_at).total_seconds())

    return {
        "session_id": session.id,
        "total_questions": session.total_questions,
        "correct_count": session.correct_count,
        "accuracy": accuracy,
        "max_streak": session.max_streak,
        "avg_response_ms": session.avg_response_ms,
        "xp_earned": session.xp_earned,
        "duration_seconds": duration_seconds,
        "difficulty_curve": json.loads(session.difficulty_curve_json or "[]"),
    }


async def get_flow_history(user_id: int, db: AsyncSession) -> list[dict]:
    """获取心流历史记录。"""
    result = await db.execute(
        select(FlowSession)
        .where(FlowSession.user_id == user_id, FlowSession.status == "completed")
        .order_by(FlowSession.completed_at.desc())
        .limit(20)
    )
    return [
        {
            "id": s.id,
            "section": s.section,
            "total_questions": s.total_questions,
            "correct_count": s.correct_count,
            "max_streak": s.max_streak,
            "xp_earned": s.xp_earned,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        }
        for s in result.scalars().all()
    ]


async def _pick_question(
    user_id: int, exam_type: str, section: str, difficulty: int, db: AsyncSession
) -> dict | None:
    """根据难度选一道题。"""
    result = await db.execute(
        select(ExamQuestion)
        .where(
            ExamQuestion.exam_type == exam_type,
            ExamQuestion.section == section,
            ExamQuestion.difficulty.between(max(1, difficulty - 1), min(5, difficulty + 1)),
        )
        .order_by(func.random())
        .limit(1)
    )
    q = result.scalar_one_or_none()
    if not q:
        # fallback: any question in this section
        result = await db.execute(
            select(ExamQuestion)
            .where(ExamQuestion.exam_type == exam_type, ExamQuestion.section == section)
            .order_by(func.random())
            .limit(1)
        )
        q = result.scalar_one_or_none()
    if not q:
        return None
    return {
        "id": q.id,
        "content": q.content,
        "options": json.loads(q.options_json) if q.options_json else [],
        "passage_text": q.passage_text,
        "difficulty": q.difficulty,
    }


async def _update_mastery(user_id: int, kp_id: int, is_correct: bool, db: AsyncSession):
    """复用训练模块的掌握度更新逻辑。"""
    from app.services.exam_training import update_mastery
    await update_mastery(user_id, kp_id, is_correct, db)
