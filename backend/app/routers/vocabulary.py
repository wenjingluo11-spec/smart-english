from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.vocabulary import UserVocabulary

router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])


class AddWordRequest(BaseModel):
    word: str
    definition: str = ""


@router.get("/")
async def list_vocabulary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserVocabulary)
        .where(UserVocabulary.user_id == user.id)
        .order_by(UserVocabulary.created_at.desc())
    )
    return result.scalars().all()


@router.post("/add")
async def add_word(
    req: AddWordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    word = UserVocabulary(user_id=user.id, word=req.word, definition=req.definition)
    db.add(word)
    await db.commit()
    await db.refresh(word)
    return word
