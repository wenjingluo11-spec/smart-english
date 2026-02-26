"""教材同步路由。"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.textbook import TextbookVersion, TextbookUnit, UserTextbookSetting
from app.schemas.textbook import SetTextbookRequest

router = APIRouter(prefix="/textbook", tags=["textbook"])


@router.get("/versions")
async def list_textbooks(
    grade: str | None = None,
    publisher: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """获取教材列表。"""
    stmt = select(TextbookVersion)
    if grade:
        stmt = stmt.where(TextbookVersion.grade == grade)
    if publisher:
        stmt = stmt.where(TextbookVersion.publisher == publisher)
    stmt = stmt.order_by(TextbookVersion.grade, TextbookVersion.semester)
    result = await db.execute(stmt)
    books = result.scalars().all()
    return [
        {
            "id": b.id, "name": b.name, "publisher": b.publisher,
            "grade": b.grade, "semester": b.semester, "cover_url": b.cover_url,
        }
        for b in books
    ]


@router.get("/versions/{textbook_id}/units")
async def list_units(
    textbook_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取教材单元列表。"""
    result = await db.execute(
        select(TextbookUnit)
        .where(TextbookUnit.textbook_id == textbook_id)
        .order_by(TextbookUnit.unit_number)
    )
    units = result.scalars().all()
    return [
        {
            "id": u.id, "unit_number": u.unit_number, "title": u.title,
            "topic": u.topic,
            "vocab_count": len(u.vocabulary_json) if u.vocabulary_json else 0,
            "grammar_count": len(u.grammar_points_json) if u.grammar_points_json else 0,
        }
        for u in units
    ]


@router.get("/units/{unit_id}")
async def get_unit_detail(
    unit_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取单元详情。"""
    result = await db.execute(select(TextbookUnit).where(TextbookUnit.id == unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(404, "单元不存在")
    return {
        "id": unit.id,
        "unit_number": unit.unit_number,
        "title": unit.title,
        "topic": unit.topic,
        "vocabulary": unit.vocabulary_json or [],
        "grammar_points": unit.grammar_points_json or [],
        "key_sentences": unit.key_sentences_json or [],
    }


@router.get("/my-setting")
async def get_my_setting(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户教材设置。"""
    result = await db.execute(
        select(UserTextbookSetting).where(UserTextbookSetting.user_id == user.id)
    )
    setting = result.scalar_one_or_none()
    if not setting:
        return {"textbook_id": None, "current_unit_id": None, "textbook": None}

    result = await db.execute(select(TextbookVersion).where(TextbookVersion.id == setting.textbook_id))
    book = result.scalar_one_or_none()

    return {
        "textbook_id": setting.textbook_id,
        "current_unit_id": setting.current_unit_id,
        "textbook": {
            "id": book.id, "name": book.name, "publisher": book.publisher,
            "grade": book.grade, "semester": book.semester,
        } if book else None,
    }


@router.post("/my-setting")
async def set_my_setting(
    req: SetTextbookRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """设置用户教材。"""
    result = await db.execute(
        select(UserTextbookSetting).where(UserTextbookSetting.user_id == user.id)
    )
    setting = result.scalar_one_or_none()
    if setting:
        setting.textbook_id = req.textbook_id
        setting.current_unit_id = req.current_unit_id
    else:
        setting = UserTextbookSetting(
            user_id=user.id,
            textbook_id=req.textbook_id,
            current_unit_id=req.current_unit_id,
        )
        db.add(setting)
    await db.commit()
    return {"ok": True}
