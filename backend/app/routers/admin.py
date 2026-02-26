"""管理后台路由 - 内容管理。"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.textbook import TextbookVersion, TextbookUnit
from app.models.grammar import GrammarTopic, GrammarExercise
from app.models.reading import ReadingMaterial

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not getattr(user, "is_admin", False):
        raise HTTPException(403, "需要管理员权限")
    return user


# ---- Dashboard Stats ----

@router.get("/stats")
async def admin_stats(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import User as UserModel
    users = (await db.execute(select(func.count()).select_from(UserModel))).scalar() or 0
    textbooks = (await db.execute(select(func.count()).select_from(TextbookVersion))).scalar() or 0
    units = (await db.execute(select(func.count()).select_from(TextbookUnit))).scalar() or 0
    grammar_topics = (await db.execute(select(func.count()).select_from(GrammarTopic))).scalar() or 0
    grammar_exercises = (await db.execute(select(func.count()).select_from(GrammarExercise))).scalar() or 0
    readings = (await db.execute(select(func.count()).select_from(ReadingMaterial))).scalar() or 0
    return {
        "users": users, "textbooks": textbooks, "units": units,
        "grammar_topics": grammar_topics, "grammar_exercises": grammar_exercises,
        "readings": readings,
    }


# ---- Textbook CRUD ----

class TextbookCreate(BaseModel):
    name: str
    publisher: str
    grade: str
    semester: str
    cover_url: str = ""


@router.post("/textbooks")
async def create_textbook(
    req: TextbookCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    book = TextbookVersion(**req.model_dump())
    db.add(book)
    await db.commit()
    await db.refresh(book)
    return {"id": book.id, "name": book.name}


class UnitCreate(BaseModel):
    textbook_id: int
    unit_number: int
    title: str
    topic: str = ""
    vocabulary_json: list | None = None
    grammar_points_json: list | None = None
    key_sentences_json: list | None = None


@router.post("/units")
async def create_unit(
    req: UnitCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    unit = TextbookUnit(**req.model_dump())
    db.add(unit)
    await db.commit()
    await db.refresh(unit)
    return {"id": unit.id, "title": unit.title}


# ---- Grammar CRUD ----

class GrammarTopicCreate(BaseModel):
    category: str
    name: str
    difficulty: int = 1
    cefr_level: str = "A1"
    explanation: str = ""
    examples_json: list | None = None
    tips_json: list | None = None
    sort_order: int = 0


@router.post("/grammar-topics")
async def create_grammar_topic(
    req: GrammarTopicCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    topic = GrammarTopic(**req.model_dump())
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return {"id": topic.id, "name": topic.name}


class GrammarExerciseCreate(BaseModel):
    topic_id: int
    content: str
    options_json: list | None = None
    answer: str
    explanation: str = ""
    exercise_type: str = "choice"


@router.post("/grammar-exercises")
async def create_grammar_exercise(
    req: GrammarExerciseCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    ex = GrammarExercise(**req.model_dump())
    db.add(ex)
    await db.commit()
    await db.refresh(ex)
    return {"id": ex.id}


@router.post("/grammar-exercises/batch")
async def batch_create_exercises(
    exercises: list[GrammarExerciseCreate],
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    created = []
    for req in exercises:
        ex = GrammarExercise(**req.model_dump())
        db.add(ex)
        created.append(ex)
    await db.commit()
    return {"created": len(created)}


# ---- Reading CRUD ----

class ReadingCreate(BaseModel):
    title: str
    content: str
    cefr_level: str = "A2"
    grade: str = ""
    word_count: int = 0
    questions_json: dict | None = None


@router.post("/readings")
async def create_reading(
    req: ReadingCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if req.word_count == 0:
        req.word_count = len(req.content.split())
    mat = ReadingMaterial(**req.model_dump())
    db.add(mat)
    await db.commit()
    await db.refresh(mat)
    return {"id": mat.id, "title": mat.title}


@router.delete("/readings/{reading_id}")
async def delete_reading(
    reading_id: int,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ReadingMaterial).where(ReadingMaterial.id == reading_id))
    mat = result.scalar_one_or_none()
    if not mat:
        raise HTTPException(404, "阅读材料不存在")
    await db.delete(mat)
    await db.commit()
    return {"deleted": True}
