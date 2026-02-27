"""行为追踪 + 认知增强个性化 + 蒸馏系统 API。

V4: 认知增强数据闭环。
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.services.behavior_tracking import (
    ingest_events, update_behavior_profile,
    get_enhancement_config, get_behavior_analytics,
)
from app.services.distillation import distill_knowledge, get_knowledge_base

router = APIRouter(prefix="/behavior", tags=["behavior"])


# ── V4.1 行为事件采集 ──

class EventBatch(BaseModel):
    session_id: str
    events: list[dict]


@router.post("/events")
async def post_events(
    req: EventBatch,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量上报行为事件。"""
    count = await ingest_events(db, user.id, req.session_id, req.events)
    return {"ingested": count}


@router.post("/profile/update")
async def update_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """触发行为画像更新。"""
    profile = await update_behavior_profile(db, user.id)
    return profile


@router.get("/profile")
async def get_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户行为画像。"""
    from app.services.behavior_tracking import get_or_create_profile, _profile_to_dict
    profile = await get_or_create_profile(db, user.id)
    return _profile_to_dict(profile)


@router.get("/analytics")
async def analytics(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户行为分析数据。"""
    return await get_behavior_analytics(db, user.id)


# ── V4.2 认知增强个性化 ──

@router.get("/enhancement-config")
async def enhancement_config(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取个性化认知增强配置。"""
    return await get_enhancement_config(db, user.id)


# ── V4.4 蒸馏系统 ──

class DistillRequest(BaseModel):
    question_type: str
    topic: str = ""
    difficulty: int = 3


@router.post("/distill")
async def run_distill(
    req: DistillRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """触发知识蒸馏（管理员功能）。"""
    result = await distill_knowledge(db, req.question_type, req.topic, req.difficulty)
    return result


@router.get("/knowledge-base")
async def list_knowledge_base(
    question_type: str = "",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """查询认知增强知识库。"""
    return await get_knowledge_base(db, question_type)
