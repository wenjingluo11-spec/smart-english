"""用户反馈路由 — 收集用户对认知增强内容的反馈。"""

import json
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.behavior import CognitiveFeedbackRecord

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackCreate(BaseModel):
    question_id: int
    rating: int  # 1=helpful, 2=neutral, 3=unhelpful
    gaze_path_id: int | None = None
    helpful_steps: list[int] | None = None
    comment: str | None = None


@router.post("/cognitive")
async def submit_feedback(
    req: FeedbackCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.rating not in (1, 2, 3):
        raise HTTPException(400, "rating must be 1, 2, or 3")
    record = CognitiveFeedbackRecord(
        user_id=user.id,
        question_id=req.question_id,
        gaze_path_id=req.gaze_path_id,
        rating=req.rating,
        helpful_steps=json.dumps(req.helpful_steps) if req.helpful_steps else None,
        comment=req.comment,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return {"id": record.id, "status": "ok"}


@router.get("/cognitive/stats")
async def feedback_stats(
    question_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(
        sa_func.count(CognitiveFeedbackRecord.id).label("count"),
        sa_func.avg(CognitiveFeedbackRecord.rating).label("avg_rating"),
    )
    if question_id is not None:
        q = q.where(CognitiveFeedbackRecord.question_id == question_id)
    row = (await db.execute(q)).one()
    return {
        "count": row.count,
        "avg_rating": round(float(row.avg_rating), 2) if row.avg_rating else None,
    }
