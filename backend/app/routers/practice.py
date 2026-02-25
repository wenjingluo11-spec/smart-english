from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.question import Question
from app.models.learning import LearningRecord
from app.schemas.practice import SubmitAnswer, SubmitResult

router = APIRouter(prefix="/practice", tags=["practice"])


@router.get("/questions")
async def get_questions(
    topic: str | None = None,
    difficulty: int | None = None,
    question_type: str | None = None,
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
    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/submit", response_model=SubmitResult)
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

    is_correct = req.answer.strip() == question.answer.strip()
    record = LearningRecord(
        user_id=user.id,
        question_id=question.id,
        is_correct=is_correct,
        time_spent=req.time_spent,
    )
    db.add(record)
    await db.commit()
    return SubmitResult(
        is_correct=is_correct,
        correct_answer=question.answer,
        explanation=question.explanation,
    )
