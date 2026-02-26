"""英语对战竞技场路由。"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.arena import BattleRequest
from app.services.arena import (
    create_battle, process_round, get_or_create_rating,
    get_leaderboard, get_battle_history, BATTLE_MODES,
)
from app.services.xp import award_xp
from app.services.missions import update_mission_progress

router = APIRouter(prefix="/arena", tags=["arena"])


@router.get("/modes")
async def modes():
    return [{"mode": k, **v} for k, v in BATTLE_MODES.items()]


@router.post("/battle")
async def start_battle(
    req: BattleRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await create_battle(req.mode, user.id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await db.commit()
    return result


@router.post("/battle/{battle_id}/round")
async def submit_round(
    battle_id: int,
    user_input: str = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await process_round(battle_id, user.id, user_input, db)
    if "error" in result:
        raise HTTPException(400, result["error"])

    # Award XP if battle finished and won
    if result.get("status") == "finished" and result.get("winner_id") == user.id:
        xp_result = await award_xp(user.id, "battle_win", db)
        mission_result = await update_mission_progress(user.id, "arena", db)
        result["xp"] = xp_result
        result["mission"] = mission_result

    await db.commit()
    return result


@router.get("/leaderboard")
async def leaderboard(db: AsyncSession = Depends(get_db)):
    return await get_leaderboard(db)


@router.get("/rating")
async def rating(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await get_or_create_rating(user.id, db)
    await db.commit()
    return {"rating": r.rating, "tier": r.tier, "wins": r.wins, "losses": r.losses, "season": r.season}


@router.get("/history")
async def history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_battle_history(user.id, db)
