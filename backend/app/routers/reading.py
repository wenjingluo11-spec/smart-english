from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.reading import ReadingMaterial
from app.schemas.reading import ReadingMaterialOut, ReadingDetailOut

router = APIRouter(prefix="/reading", tags=["reading"])


@router.get("/materials", response_model=list[ReadingMaterialOut])
async def list_materials(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReadingMaterial)
        .where(ReadingMaterial.cefr_level == user.cefr_level)
        .limit(20)
    )
    return result.scalars().all()


@router.get("/{material_id}", response_model=ReadingDetailOut)
async def get_material(
    material_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReadingMaterial).where(ReadingMaterial.id == material_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="阅读材料不存在")
    return material
