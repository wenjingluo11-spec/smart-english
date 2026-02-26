"""真实世界任务路由。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.quest import QuestSubmitRequest
from app.services.quest import get_available_quests, start_quest, submit_evidence, get_user_quests, get_community_feed
from app.services.xp import award_xp
from app.services.missions import update_mission_progress

router = APIRouter(prefix="/quest", tags=["quest"])


@router.get("/available")
async def available(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_available_quests(user.id, db)


@router.post("/start/{template_id}")
async def start(
    template_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await start_quest(template_id, user.id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await db.commit()
    return result


@router.post("/submit/{quest_id}")
async def submit(
    quest_id: int,
    req: QuestSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await submit_evidence(quest_id, req.evidence_url, user.id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])

    if result.get("passed"):
        xp_result = await award_xp(user.id, "quest_complete", db)
        mission_result = await update_mission_progress(user.id, "quest", db)
        result["xp"] = xp_result
        result["mission"] = mission_result

    await db.commit()
    return result


@router.get("/my-quests")
async def my_quests(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_quests(user.id, db)


@router.get("/community")
async def community(db: AsyncSession = Depends(get_db)):
    return await get_community_feed(db)
