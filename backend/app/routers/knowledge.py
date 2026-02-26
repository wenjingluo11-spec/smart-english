"""知识图谱路由。"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.services.knowledge import get_galaxy_view, get_node_detail, expand_node, update_node_status, get_galaxy_stats
from app.services.xp import award_xp
from app.services.missions import update_mission_progress

router = APIRouter(prefix="/galaxy", tags=["galaxy"])


@router.get("/view")
async def view(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_galaxy_view(user.id, db, limit, offset)


@router.get("/node/{node_id}")
async def node_detail(
    node_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await get_node_detail(node_id, user.id, db)
    if "error" in result:
        raise HTTPException(404, result["error"])
    await db.commit()
    return result


@router.post("/explore/{node_id}")
async def explore(
    node_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await expand_node(node_id, user.id, db)
    if "error" in result:
        raise HTTPException(404, result["error"])
    xp_result = await award_xp(user.id, "galaxy_explore", db)
    mission_result = await update_mission_progress(user.id, "galaxy", db)
    result["xp"] = xp_result
    result["mission"] = mission_result
    await db.commit()
    return result


@router.get("/stats")
async def stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_galaxy_stats(user.id, db)


@router.post("/learn/{node_id}")
async def learn(
    node_id: int,
    status: str = Query(..., pattern="^(seen|familiar|mastered)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await update_node_status(user.id, node_id, status, db)
    if status == "mastered":
        xp_result = await award_xp(user.id, "galaxy_explore", db)
        await db.commit()
        return {"status": status, "xp": xp_result}
    await db.commit()
    return {"status": status}
