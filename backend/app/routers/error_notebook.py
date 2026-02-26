"""错题本路由。"""

import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.error_notebook import ErrorNotebookEntry
from app.schemas.error_notebook import RetryAnswerRequest
from app.services.error_notebook import get_error_stats
from app.services.llm import judge_answer

router = APIRouter(prefix="/errors", tags=["error-notebook"])


@router.get("/")
async def list_errors(
    status: str | None = None,
    topic: str | None = None,
    question_type: str | None = None,
    difficulty: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """分页获取错题列表，支持筛选。"""
    stmt = select(ErrorNotebookEntry).where(ErrorNotebookEntry.user_id == user.id)
    count_stmt = select(func.count()).select_from(ErrorNotebookEntry).where(ErrorNotebookEntry.user_id == user.id)

    if status:
        stmt = stmt.where(ErrorNotebookEntry.status == status)
        count_stmt = count_stmt.where(ErrorNotebookEntry.status == status)
    if topic:
        stmt = stmt.where(ErrorNotebookEntry.topic == topic)
        count_stmt = count_stmt.where(ErrorNotebookEntry.topic == topic)
    if question_type:
        stmt = stmt.where(ErrorNotebookEntry.question_type == question_type)
        count_stmt = count_stmt.where(ErrorNotebookEntry.question_type == question_type)
    if difficulty:
        stmt = stmt.where(ErrorNotebookEntry.difficulty == difficulty)
        count_stmt = count_stmt.where(ErrorNotebookEntry.difficulty == difficulty)

    total = (await db.execute(count_stmt)).scalar() or 0
    stmt = stmt.order_by(ErrorNotebookEntry.created_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    entries = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": e.id,
                "source_type": e.source_type,
                "question_snapshot": e.question_snapshot,
                "question_type": e.question_type,
                "topic": e.topic,
                "difficulty": e.difficulty,
                "user_answer": e.user_answer,
                "correct_answer": e.correct_answer,
                "explanation": e.explanation,
                "status": e.status,
                "retry_count": e.retry_count,
                "created_at": e.created_at.isoformat() if e.created_at else "",
            }
            for e in entries
        ],
    }


@router.get("/stats")
async def error_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """错题统计与趋势。"""
    return await get_error_stats(user.id, db)


@router.post("/{error_id}/retry")
async def retry_error(
    error_id: int,
    req: RetryAnswerRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """重做错题。"""
    result = await db.execute(
        select(ErrorNotebookEntry).where(
            ErrorNotebookEntry.id == error_id,
            ErrorNotebookEntry.user_id == user.id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(404, "错题不存在")

    judge_result = await judge_answer(entry.question_snapshot, entry.correct_answer, req.answer)
    entry.retry_count += 1

    if judge_result["is_correct"]:
        entry.status = "mastered"
        entry.mastered_at = datetime.datetime.now(datetime.timezone.utc)

    await db.commit()
    return {
        "is_correct": judge_result["is_correct"],
        "correct_answer": judge_result["correct_answer"],
        "explanation": judge_result["explanation"],
        "status": entry.status,
        "retry_count": entry.retry_count,
    }


@router.post("/{error_id}/master")
async def mark_mastered(
    error_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """手动标记为已掌握。"""
    result = await db.execute(
        select(ErrorNotebookEntry).where(
            ErrorNotebookEntry.id == error_id,
            ErrorNotebookEntry.user_id == user.id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(404, "错题不存在")

    entry.status = "mastered"
    entry.mastered_at = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()
    return {"status": "mastered"}


@router.delete("/{error_id}")
async def delete_error(
    error_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除错题。"""
    result = await db.execute(
        select(ErrorNotebookEntry).where(
            ErrorNotebookEntry.id == error_id,
            ErrorNotebookEntry.user_id == user.id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(404, "错题不存在")

    await db.delete(entry)
    await db.commit()
    return {"ok": True}
