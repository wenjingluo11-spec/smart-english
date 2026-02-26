"""SM-2 spaced repetition algorithm."""

import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.vocabulary import UserVocabulary

# Intervals in days based on feedback
# "known" -> interval * 2.5
# "fuzzy" -> interval * 1.2
# "forgot" -> reset to 1 day

def compute_next_review(current_interval_days: float, feedback: str) -> tuple[float, str]:
    """Returns (new_interval_days, new_status)."""
    if feedback == "known":
        new_interval = max(current_interval_days * 2.5, 1)
        status = "mastered" if new_interval >= 21 else "learning"
    elif feedback == "fuzzy":
        new_interval = max(current_interval_days * 1.2, 1)
        status = "learning"
    else:  # forgot
        new_interval = 1
        status = "new"
    return new_interval, status


async def get_due_words(user_id: int, db: AsyncSession, limit: int = 20) -> list[UserVocabulary]:
    """Get words due for review (next_review_at <= now or is NULL)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    result = await db.execute(
        select(UserVocabulary)
        .where(UserVocabulary.user_id == user_id)
        .where(
            (UserVocabulary.next_review_at <= now) | (UserVocabulary.next_review_at.is_(None))
        )
        .where(UserVocabulary.status != "mastered")
        .order_by(UserVocabulary.next_review_at.asc().nullsfirst())
        .limit(limit)
    )
    return list(result.scalars().all())


async def process_review(word_id: int, user_id: int, feedback: str, db: AsyncSession) -> dict:
    """Process a review feedback and update the word's schedule."""
    result = await db.execute(
        select(UserVocabulary)
        .where(UserVocabulary.id == word_id, UserVocabulary.user_id == user_id)
    )
    word = result.scalar_one_or_none()
    if not word:
        return {"error": "Word not found"}

    # Calculate current interval
    now = datetime.datetime.now(datetime.timezone.utc)
    if word.next_review_at and word.created_at:
        # Rough estimate of current interval
        current_interval = max((now - word.created_at).days, 1)
    else:
        current_interval = 1

    new_interval, new_status = compute_next_review(current_interval, feedback)
    word.status = new_status
    word.next_review_at = now + datetime.timedelta(days=new_interval)
    await db.flush()

    return {
        "word_id": word.id,
        "word": word.word,
        "new_status": new_status,
        "next_review_at": word.next_review_at.isoformat(),
        "interval_days": round(new_interval, 1),
    }
