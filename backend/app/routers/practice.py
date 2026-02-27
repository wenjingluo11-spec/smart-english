from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, distinct, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.question import Question
from app.models.learning import LearningRecord
from app.schemas.practice import SubmitAnswer, SubmitResult, QuestionOut

router = APIRouter(prefix="/practice", tags=["practice"])


@router.get("/filters")
async def get_filters(
    question_type: str | None = None,
    difficulty: int | None = None,
    grade: str | None = None,
    topic: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """返回当前用户可用的筛选选项（基于 stage），支持级联过滤。

    统计某维度时，排除该维度自身的条件，保留其他维度的条件。
    """

    def _apply_cross_filters(stmt, *, exclude: str):
        if exclude != "question_type" and question_type:
            stmt = stmt.where(Question.question_type == question_type)
        if exclude != "difficulty" and difficulty:
            stmt = stmt.where(Question.difficulty == difficulty)
        if exclude != "grade" and grade:
            stmt = stmt.where(Question.grade == grade)
        if exclude != "topic" and topic:
            stmt = stmt.where(Question.topic == topic)
        return stmt

    base_where = Question.stage == user.grade_level

    qt_stmt = _apply_cross_filters(
        select(Question.question_type, func.count())
        .where(base_where)
        .group_by(Question.question_type)
        .order_by(func.count().desc()),
        exclude="question_type",
    )
    qt_result = await db.execute(qt_stmt)
    question_types = [{"value": row[0], "count": row[1]} for row in qt_result.all() if row[0]]

    diff_stmt = _apply_cross_filters(
        select(Question.difficulty, func.count())
        .where(base_where)
        .group_by(Question.difficulty)
        .order_by(Question.difficulty),
        exclude="difficulty",
    )
    diff_result = await db.execute(diff_stmt)
    difficulties = [{"value": row[0], "count": row[1]} for row in diff_result.all()]

    grade_stmt = _apply_cross_filters(
        select(Question.grade, func.count())
        .where(base_where)
        .group_by(Question.grade)
        .order_by(func.count().desc()),
        exclude="grade",
    )
    grade_result = await db.execute(grade_stmt)
    grades = [{"value": row[0], "count": row[1]} for row in grade_result.all() if row[0]]

    topic_stmt = _apply_cross_filters(
        select(Question.topic, func.count())
        .where(base_where)
        .group_by(Question.topic)
        .order_by(func.count().desc())
        .limit(50),
        exclude="topic",
    )
    topic_result = await db.execute(topic_stmt)
    topics = [{"value": row[0], "count": row[1]} for row in topic_result.all() if row[0]]

    return {
        "question_types": question_types,
        "difficulties": difficulties,
        "grades": grades,
        "topics": topics,
    }


@router.get("/questions", response_model=list[QuestionOut])
async def get_questions(
    topic: str | None = None,
    difficulty: int | None = None,
    question_type: str | None = None,
    grade: str | None = None,
    limit: int = Query(default=10, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Question).where(Question.stage == user.grade_level)
    if topic:
        stmt = stmt.where(Question.topic == topic)
    if difficulty:
        stmt = stmt.where(Question.difficulty == difficulty)
    if question_type:
        stmt = stmt.where(Question.question_type == question_type)
    if grade:
        stmt = stmt.where(Question.grade == grade)
    stmt = stmt.order_by(func.random()).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/submit")
async def submit_answer(
    req: SubmitAnswer,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Question).where(Question.id == req.question_id))
    question = result.scalar_one_or_none()
    if not question:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="题目不存在")

    from app.services.llm import judge_answer
    result = await judge_answer(question.content, question.answer, req.answer)

    # 题眼分析（认知增强）— 答题后自动触发
    from app.services.question_analysis import analyze_question
    options_text = ""
    if question.options_json:
        import json as _json
        try:
            opts = _json.loads(question.options_json) if isinstance(question.options_json, str) else question.options_json
            options_text = "\n".join(f"{k}. {v}" for k, v in opts.items())
        except Exception:
            pass
    analysis = await analyze_question(
        db=db,
        question_content=question.content,
        question_type=question.question_type or "",
        options=options_text,
        question_id=question.id,
    )

    record = LearningRecord(
        user_id=user.id,
        question_id=question.id,
        is_correct=result["is_correct"],
        time_spent=req.time_spent,
    )
    db.add(record)

    # Auto-collect error
    if not result["is_correct"]:
        from app.services.error_notebook import auto_collect_error
        await auto_collect_error(
            user_id=user.id,
            source_type="practice",
            question_snapshot=question.content,
            user_answer=req.answer,
            correct_answer=result["correct_answer"],
            explanation=result["explanation"],
            db=db,
            question_type=question.question_type,
            topic=question.topic,
            difficulty=question.difficulty,
            question_id=question.id,
        )

    # Award XP
    from app.services.xp import award_xp
    from app.services.missions import update_mission_progress
    action = "practice_correct" if result["is_correct"] else "practice_wrong"
    xp_result = await award_xp(user.id, action, db)
    mission_result = await update_mission_progress(user.id, "practice", db)

    await db.commit()
    return {
        "is_correct": result["is_correct"],
        "correct_answer": result["correct_answer"],
        "explanation": result["explanation"],
        # 认知增强字段
        "how_to_spot": result.get("how_to_spot", ""),
        "key_clues": result.get("key_clues", []),
        "common_trap": result.get("common_trap", ""),
        "method": result.get("method", ""),
        # V3: 引导发现模式
        "hint_levels": result.get("hint_levels", []),
        "guided_discovery": result.get("guided_discovery", ""),
        # 题眼分析
        "analysis": analysis,
        "xp": xp_result,
        "mission": mission_result,
    }
