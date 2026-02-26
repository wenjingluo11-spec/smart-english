"""学习报告服务。"""

import datetime
from sqlalchemy import select, func, case, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.learning_time import LearningTimeLog
from app.models.learning import LearningRecord
from app.models.writing import WritingSubmission
from app.models.vocabulary import UserVocabulary
from app.models.gamification import UserXP


async def get_time_stats(user_id: int, days: int, db: AsyncSession) -> dict:
    """按模块统计学习时长。"""
    since = datetime.date.today() - datetime.timedelta(days=days)
    result = await db.execute(
        select(LearningTimeLog.module, func.sum(LearningTimeLog.duration_seconds))
        .where(LearningTimeLog.user_id == user_id, LearningTimeLog.date >= since)
        .group_by(LearningTimeLog.module)
    )
    by_module = {r[0]: r[1] or 0 for r in result.all()}

    # Daily totals
    result = await db.execute(
        select(LearningTimeLog.date, func.sum(LearningTimeLog.duration_seconds))
        .where(LearningTimeLog.user_id == user_id, LearningTimeLog.date >= since)
        .group_by(LearningTimeLog.date)
        .order_by(LearningTimeLog.date)
    )
    daily = [{"date": r[0].isoformat(), "seconds": r[1] or 0} for r in result.all()]

    # Daily by module (for stacked chart)
    result = await db.execute(
        select(LearningTimeLog.date, LearningTimeLog.module, func.sum(LearningTimeLog.duration_seconds))
        .where(LearningTimeLog.user_id == user_id, LearningTimeLog.date >= since)
        .group_by(LearningTimeLog.date, LearningTimeLog.module)
        .order_by(LearningTimeLog.date)
    )
    daily_by_module: list[dict] = []
    for r in result.all():
        daily_by_module.append({"date": r[0].isoformat(), "module": r[1], "seconds": r[2] or 0})

    total_seconds = sum(by_module.values())
    return {
        "total_seconds": total_seconds,
        "total_minutes": round(total_seconds / 60),
        "by_module": by_module,
        "daily": daily,
        "daily_by_module": daily_by_module,
    }


async def get_score_trends(user_id: int, db: AsyncSession) -> dict:
    """多模块成绩趋势（按周聚合）。"""
    today = datetime.date.today()
    weeks = []
    for i in range(11, -1, -1):
        week_start = today - datetime.timedelta(days=today.weekday() + 7 * i)
        week_end = week_start + datetime.timedelta(days=7)
        ws = datetime.datetime.combine(week_start, datetime.time.min, tzinfo=datetime.timezone.utc)
        we = datetime.datetime.combine(week_end, datetime.time.min, tzinfo=datetime.timezone.utc)

        # Practice accuracy
        result = await db.execute(
            select(
                func.count().label("total"),
                func.sum(case((LearningRecord.is_correct == True, 1), else_=0)).label("correct"),
            ).where(LearningRecord.user_id == user_id, LearningRecord.created_at >= ws, LearningRecord.created_at < we)
        )
        row = result.one()
        practice_rate = round((row.correct or 0) / row.total * 100) if row.total else None

        # Writing avg score
        result = await db.execute(
            select(func.avg(WritingSubmission.score))
            .where(WritingSubmission.user_id == user_id, WritingSubmission.created_at >= ws, WritingSubmission.created_at < we, WritingSubmission.score.isnot(None))
        )
        writing_avg = result.scalar()
        writing_avg = round(writing_avg) if writing_avg else None

        weeks.append({
            "week": week_start.isoformat(),
            "practice_accuracy": practice_rate,
            "writing_score": writing_avg,
        })

    return {"weeks": weeks}


async def get_mastery_heatmap(user_id: int, db: AsyncSession) -> dict:
    """知识点掌握热力图（按 topic 聚合正确率）。"""
    result = await db.execute(
        select(
            LearningRecord.question_id,
        ).where(LearningRecord.user_id == user_id)
    )

    # Join with questions to get topics
    from app.models.question import Question
    result = await db.execute(
        select(
            Question.topic,
            func.count().label("total"),
            func.sum(case((LearningRecord.is_correct == True, 1), else_=0)).label("correct"),
        )
        .join(Question, LearningRecord.question_id == Question.id)
        .where(LearningRecord.user_id == user_id)
        .group_by(Question.topic)
        .order_by(func.count().desc())
        .limit(20)
    )
    topics = []
    for r in result.all():
        rate = round((r.correct or 0) / r.total * 100) if r.total else 0
        topics.append({"topic": r.topic or "未分类", "total": r.total, "correct": r.correct or 0, "rate": rate})

    return {"topics": topics}


async def get_peer_comparison(user_id: int, db: AsyncSession) -> dict:
    """同年级百分位排名。"""
    from app.models.user import User
    # Get user's grade
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return {"percentile": 0, "total_peers": 0}

    # Get user's XP
    result = await db.execute(select(UserXP).where(UserXP.user_id == user_id))
    user_xp = result.scalar_one_or_none()
    if not user_xp:
        return {"percentile": 0, "total_peers": 0}

    # Count peers with same grade_level
    result = await db.execute(
        select(func.count()).select_from(User).where(User.grade_level == user.grade_level)
    )
    total_peers = result.scalar() or 1

    # Count peers with lower XP
    result = await db.execute(
        select(func.count())
        .select_from(UserXP)
        .join(User, UserXP.user_id == User.id)
        .where(User.grade_level == user.grade_level, UserXP.total_xp < user_xp.total_xp)
    )
    lower_count = result.scalar() or 0

    percentile = round(lower_count / total_peers * 100) if total_peers > 0 else 0

    return {
        "percentile": percentile,
        "total_peers": total_peers,
        "your_xp": user_xp.total_xp,
        "your_level": user_xp.level,
    }
