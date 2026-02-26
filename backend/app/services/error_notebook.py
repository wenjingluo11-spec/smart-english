"""错题本自动收集与统计服务。"""

import datetime
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.error_notebook import ErrorNotebookEntry


async def auto_collect_error(
    user_id: int,
    source_type: str,
    question_snapshot: str,
    user_answer: str,
    correct_answer: str,
    explanation: str,
    db: AsyncSession,
    question_type: str = "",
    topic: str = "",
    difficulty: int = 3,
    question_id: int | None = None,
):
    """答错时自动收集到错题本。如果同一题已存在则更新。"""
    existing = None
    if question_id:
        result = await db.execute(
            select(ErrorNotebookEntry).where(
                ErrorNotebookEntry.user_id == user_id,
                ErrorNotebookEntry.question_id == question_id,
            )
        )
        existing = result.scalar_one_or_none()

    if existing:
        existing.user_answer = user_answer
        existing.correct_answer = correct_answer
        existing.explanation = explanation
        existing.retry_count += 1
        existing.status = "unmastered"
        existing.mastered_at = None
    else:
        entry = ErrorNotebookEntry(
            user_id=user_id,
            source_type=source_type,
            question_snapshot=question_snapshot,
            question_type=question_type,
            topic=topic,
            difficulty=difficulty,
            user_answer=user_answer,
            correct_answer=correct_answer,
            explanation=explanation,
            question_id=question_id,
        )
        db.add(entry)


async def get_error_stats(user_id: int, db: AsyncSession) -> dict:
    """获取错题统计。"""
    base = ErrorNotebookEntry.user_id == user_id

    # 总数
    result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((ErrorNotebookEntry.status == "unmastered", 1), else_=0)).label("unmastered"),
            func.sum(case((ErrorNotebookEntry.status == "mastered", 1), else_=0)).label("mastered"),
        ).where(base)
    )
    row = result.one()
    total = row.total or 0
    unmastered = row.unmastered or 0
    mastered = row.mastered or 0

    # 按 topic 分组
    result = await db.execute(
        select(ErrorNotebookEntry.topic, func.count())
        .where(base, ErrorNotebookEntry.status == "unmastered")
        .group_by(ErrorNotebookEntry.topic)
        .order_by(func.count().desc())
        .limit(10)
    )
    by_topic = [{"topic": r[0] or "未分类", "count": r[1]} for r in result.all()]

    # 按 question_type 分组
    result = await db.execute(
        select(ErrorNotebookEntry.question_type, func.count())
        .where(base, ErrorNotebookEntry.status == "unmastered")
        .group_by(ErrorNotebookEntry.question_type)
        .order_by(func.count().desc())
    )
    by_type = [{"type": r[0] or "未分类", "count": r[1]} for r in result.all()]

    # 最近 7 天错题趋势
    today = datetime.date.today()
    recent_trend = []
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_start = datetime.datetime.combine(day, datetime.time.min, tzinfo=datetime.timezone.utc)
        day_end = datetime.datetime.combine(day + datetime.timedelta(days=1), datetime.time.min, tzinfo=datetime.timezone.utc)
        result = await db.execute(
            select(func.count()).select_from(ErrorNotebookEntry)
            .where(base, ErrorNotebookEntry.created_at >= day_start, ErrorNotebookEntry.created_at < day_end)
        )
        count = result.scalar() or 0
        recent_trend.append({"date": day.isoformat(), "count": count})

    return {
        "total": total,
        "unmastered": unmastered,
        "mastered": mastered,
        "by_topic": by_topic,
        "by_type": by_type,
        "recent_trend": recent_trend,
    }
