from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.vocabulary import UserVocabulary
from app.services.spaced_repetition import get_due_words, process_review
from app.services.llm import chat_once

router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])


class AddWordRequest(BaseModel):
    word: str
    definition: str = ""


class ReviewRequest(BaseModel):
    word_id: int
    feedback: str  # "known" | "fuzzy" | "forgot"


WORD_DETAIL_PROMPT = """请为以下英语单词提供详细信息，适合中国中学生学习。
单词：{word}

请返回 JSON 格式：
{{"phonetic": "音标", "pos": "词性", "definition_en": "英文释义", "definition_cn": "中文释义", "etymology": "词源简介（简短）", "collocations": ["常见搭配1", "常见搭配2", "常见搭配3"], "example_sentences": [{{"en": "英文例句", "cn": "中文翻译"}}], "synonyms": ["近义词1"], "antonyms": ["反义词1"], "word_family": ["相关词1"], "memory_tip": "记忆技巧"}}"""


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


@router.get("/due")
async def due_vocabulary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    words = await get_due_words(user.id, db)
    return [
        {"id": w.id, "word": w.word, "definition": w.definition, "status": w.status}
        for w in words
    ]


@router.post("/review")
async def review_word(
    req: ReviewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.xp import award_xp
    from app.services.missions import update_mission_progress

    result = await process_review(req.word_id, user.id, req.feedback, db)
    xp_result = await award_xp(user.id, "vocab_review", db)
    mission_result = await update_mission_progress(user.id, "review", db)
    await db.commit()
    return {**result, "xp": xp_result, "mission": mission_result}


@router.get("/word-detail/{word}")
async def word_detail(word: str):
    """获取单词详细信息（LLM 生成）。"""
    import json
    import logging
    logger = logging.getLogger(__name__)
    try:
        prompt_text = WORD_DETAIL_PROMPT.format(word=word)
        raw = await chat_once(
            [{"role": "user", "content": prompt_text}],
            system_prompt="你是一位英语词汇专家，请严格按照要求的 JSON 格式返回。",
        )
        # 尝试清理 markdown 代码块标记
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"word": word, "raw": raw}
    except Exception as e:
        logger.exception("word_detail failed for word=%s: %s", word, e)
        return {"word": word, "error": "获取单词详情失败，请稍后重试"}


@router.get("/stats")
async def vocab_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """词汇统计。"""
    from sqlalchemy import func
    result = await db.execute(
        select(UserVocabulary.status, func.count())
        .where(UserVocabulary.user_id == user.id)
        .group_by(UserVocabulary.status)
    )
    status_counts = {r[0]: r[1] for r in result.all()}

    result = await db.execute(
        select(func.count()).select_from(UserVocabulary)
        .where(UserVocabulary.user_id == user.id)
    )
    total = result.scalar() or 0

    return {
        "total": total,
        "new": status_counts.get("new", 0),
        "learning": status_counts.get("learning", 0),
        "mastered": status_counts.get("mastered", 0),
    }
