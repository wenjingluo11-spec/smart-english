"""语法专项路由。"""

import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.grammar import GrammarTopic, GrammarExercise, UserGrammarProgress

router = APIRouter(prefix="/grammar", tags=["grammar"])


@router.get("/topics")
async def list_topics(
    category: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取语法知识点列表（含掌握度）。"""
    stmt = select(GrammarTopic)
    if category:
        stmt = stmt.where(GrammarTopic.category == category)
    stmt = stmt.order_by(GrammarTopic.sort_order, GrammarTopic.difficulty)
    result = await db.execute(stmt)
    topics = result.scalars().all()

    # Get user progress
    prog_result = await db.execute(
        select(UserGrammarProgress).where(UserGrammarProgress.user_id == user.id)
    )
    progress_map = {p.topic_id: p for p in prog_result.scalars().all()}

    return [
        {
            "id": t.id,
            "category": t.category,
            "name": t.name,
            "difficulty": t.difficulty,
            "cefr_level": t.cefr_level,
            "mastery": progress_map[t.id].mastery if t.id in progress_map else 0,
            "total_attempts": progress_map[t.id].total_attempts if t.id in progress_map else 0,
        }
        for t in topics
    ]


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """获取语法分类列表。"""
    result = await db.execute(
        select(GrammarTopic.category, func.count())
        .group_by(GrammarTopic.category)
        .order_by(GrammarTopic.category)
    )
    return [{"category": r[0], "count": r[1]} for r in result.all()]


@router.get("/topics/{topic_id}")
async def get_topic_detail(
    topic_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取语法知识点详情。"""
    result = await db.execute(select(GrammarTopic).where(GrammarTopic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(404, "语法知识点不存在")
    return {
        "id": topic.id,
        "category": topic.category,
        "name": topic.name,
        "difficulty": topic.difficulty,
        "cefr_level": topic.cefr_level,
        "explanation": topic.explanation,
        "examples": topic.examples_json or [],
        "tips": topic.tips_json or [],
    }


@router.get("/topics/{topic_id}/exercises")
async def get_exercises(
    topic_id: int,
    limit: int = Query(default=10, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    """获取语法练习题。"""
    result = await db.execute(
        select(GrammarExercise)
        .where(GrammarExercise.topic_id == topic_id)
        .order_by(func.random())
        .limit(limit)
    )
    exercises = result.scalars().all()
    return [
        {
            "id": e.id,
            "content": e.content,
            "options": e.options_json or [],
            "exercise_type": e.exercise_type,
        }
        for e in exercises
    ]


@router.post("/exercises/{exercise_id}/submit")
async def submit_exercise(
    exercise_id: int,
    answer: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """提交语法练习答案。"""
    result = await db.execute(select(GrammarExercise).where(GrammarExercise.id == exercise_id))
    exercise = result.scalar_one_or_none()
    if not exercise:
        raise HTTPException(404, "练习题不存在")

    is_correct = answer.strip().upper() == exercise.answer.strip().upper()

    # Update progress
    prog_result = await db.execute(
        select(UserGrammarProgress).where(
            UserGrammarProgress.user_id == user.id,
            UserGrammarProgress.topic_id == exercise.topic_id,
        )
    )
    progress = prog_result.scalar_one_or_none()
    if not progress:
        progress = UserGrammarProgress(
            user_id=user.id, topic_id=exercise.topic_id,
        )
        db.add(progress)

    progress.total_attempts += 1
    if is_correct:
        progress.correct_count += 1
    progress.mastery = min(100, round(progress.correct_count / progress.total_attempts * 100))
    progress.last_practiced_at = datetime.datetime.now(datetime.timezone.utc)

    # Auto-collect error
    if not is_correct:
        from app.services.error_notebook import auto_collect_error
        await auto_collect_error(
            user_id=user.id,
            source_type="grammar",
            question_snapshot=exercise.content,
            user_answer=answer,
            correct_answer=exercise.answer,
            explanation=exercise.explanation,
            db=db,
            question_type=exercise.exercise_type,
        )

    # XP
    from app.services.xp import award_xp
    xp_result = None
    if is_correct:
        xp_result = await award_xp(user.id, "grammar_correct", db)

    await db.commit()
    return {
        "is_correct": is_correct,
        "correct_answer": exercise.answer,
        "explanation": exercise.explanation,
        "mastery": progress.mastery,
        "xp": xp_result,
    }
