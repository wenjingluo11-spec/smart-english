"""Stats & gamification API endpoints."""

import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.learning import LearningRecord
from app.models.writing import WritingSubmission
from app.models.vocabulary import UserVocabulary
from app.models.gamification import UserXP, Achievement, DailyMission
from app.services.xp import get_or_create_xp, level_to_cefr, xp_for_level
from app.services.missions import get_or_generate_missions

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/dashboard")
async def dashboard_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregated dashboard data."""
    today = datetime.date.today()
    today_start = datetime.datetime.combine(today, datetime.time.min, tzinfo=datetime.timezone.utc)

    # Today's practice count
    result = await db.execute(
        select(func.count()).select_from(LearningRecord)
        .where(LearningRecord.user_id == user.id, LearningRecord.created_at >= today_start)
    )
    today_practice = result.scalar() or 0

    # XP & streak
    xp = await get_or_create_xp(user.id, db)

    # Vocab mastery rate
    result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((UserVocabulary.status == "mastered", 1), else_=0)).label("mastered"),
        ).where(UserVocabulary.user_id == user.id)
    )
    row = result.one()
    vocab_total = row.total or 0
    vocab_mastered = row.mastered or 0
    vocab_rate = round(vocab_mastered / vocab_total * 100) if vocab_total > 0 else 0

    await db.commit()

    return {
        "today_practice": today_practice,
        "streak_days": xp.streak_days,
        "vocab_mastery_rate": vocab_rate,
        "level": xp.level,
        "total_xp": xp.total_xp,
        "xp_for_next": xp_for_level(xp.level + 1),
        "cefr": level_to_cefr(xp.level),
    }


@router.get("/xp")
async def get_xp(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    xp = await get_or_create_xp(user.id, db)
    await db.commit()
    return {
        "total_xp": xp.total_xp,
        "level": xp.level,
        "cefr": level_to_cefr(xp.level),
        "xp_for_current": xp_for_level(xp.level),
        "xp_for_next": xp_for_level(xp.level + 1),
        "streak_days": xp.streak_days,
    }


@router.get("/achievements")
async def get_achievements(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Achievement)
        .where(Achievement.user_id == user.id)
        .order_by(Achievement.unlocked_at.desc())
    )
    achs = result.scalars().all()
    return [
        {"key": a.key, "name": a.name, "description": a.description, "icon": a.icon, "unlocked_at": a.unlocked_at.isoformat()}
        for a in achs
    ]


@router.get("/daily-missions")
async def daily_missions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    missions = await get_or_generate_missions(user.id, db)
    await db.commit()
    return [
        {
            "id": m.id,
            "mission_type": m.mission_type,
            "title": m.title,
            "target": m.target,
            "progress": m.progress,
            "completed": m.completed,
            "xp_reward": m.xp_reward,
        }
        for m in missions
    ]


@router.get("/module-progress")
async def module_progress(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Progress badges for sidebar."""
    now = datetime.datetime.now(datetime.timezone.utc)

    # Due vocab count
    result = await db.execute(
        select(func.count()).select_from(UserVocabulary)
        .where(
            UserVocabulary.user_id == user.id,
            (UserVocabulary.next_review_at <= now) | (UserVocabulary.next_review_at.is_(None)),
            UserVocabulary.status != "mastered",
        )
    )
    due_vocab = result.scalar() or 0

    # Today's practice
    today_start = datetime.datetime.combine(datetime.date.today(), datetime.time.min, tzinfo=datetime.timezone.utc)
    result = await db.execute(
        select(func.count()).select_from(LearningRecord)
        .where(LearningRecord.user_id == user.id, LearningRecord.created_at >= today_start)
    )
    today_practice = result.scalar() or 0

    # Writing count
    result = await db.execute(
        select(func.count()).select_from(WritingSubmission)
        .where(WritingSubmission.user_id == user.id)
    )
    writing_count = result.scalar() or 0

    # Error count (unmastered)
    from app.models.error_notebook import ErrorNotebookEntry
    result = await db.execute(
        select(func.count()).select_from(ErrorNotebookEntry)
        .where(ErrorNotebookEntry.user_id == user.id, ErrorNotebookEntry.status == "unmastered")
    )
    error_count = result.scalar() or 0

    return {
        "due_vocab": due_vocab,
        "today_practice": today_practice,
        "writing_count": writing_count,
        "error_count": error_count,
    }


# ── 学习报告增强 ──

@router.post("/time-log")
async def log_time(
    module: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """心跳记录学习时长（每次 60 秒）。"""
    from app.models.learning_time import LearningTimeLog
    today = datetime.date.today()
    result = await db.execute(
        select(LearningTimeLog).where(
            LearningTimeLog.user_id == user.id,
            LearningTimeLog.module == module,
            LearningTimeLog.date == today,
        )
    )
    log = result.scalar_one_or_none()
    if log:
        log.duration_seconds += 60
    else:
        log = LearningTimeLog(user_id=user.id, module=module, duration_seconds=60, date=today)
        db.add(log)
    await db.commit()
    return {"ok": True}


@router.get("/report/time")
async def report_time(
    days: int = 30,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.reports import get_time_stats
    return await get_time_stats(user.id, days, db)


@router.get("/report/scores")
async def report_scores(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.reports import get_score_trends
    return await get_score_trends(user.id, db)


@router.get("/report/mastery-heatmap")
async def report_mastery_heatmap(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.reports import get_mastery_heatmap
    return await get_mastery_heatmap(user.id, db)


@router.get("/report/peer-rank")
async def report_peer_rank(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.reports import get_peer_comparison
    return await get_peer_comparison(user.id, db)


@router.get("/learning-report")
async def learning_report(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Comprehensive learning report for profile page."""
    today = datetime.date.today()

    # 7-day accuracy trend
    daily_accuracy = []
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_start = datetime.datetime.combine(day, datetime.time.min, tzinfo=datetime.timezone.utc)
        day_end = datetime.datetime.combine(day + datetime.timedelta(days=1), datetime.time.min, tzinfo=datetime.timezone.utc)
        result = await db.execute(
            select(
                func.count().label("total"),
                func.sum(case((LearningRecord.is_correct == True, 1), else_=0)).label("correct"),
            ).where(
                LearningRecord.user_id == user.id,
                LearningRecord.created_at >= day_start,
                LearningRecord.created_at < day_end,
            )
        )
        row = result.one()
        total = row.total or 0
        correct = row.correct or 0
        daily_accuracy.append({
            "date": day.isoformat(),
            "total": total,
            "correct": correct,
            "rate": round(correct / total * 100) if total > 0 else 0,
        })

    # 12-week heatmap
    heatmap = []
    for i in range(83, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_start = datetime.datetime.combine(day, datetime.time.min, tzinfo=datetime.timezone.utc)
        day_end = datetime.datetime.combine(day + datetime.timedelta(days=1), datetime.time.min, tzinfo=datetime.timezone.utc)
        result = await db.execute(
            select(func.count()).select_from(LearningRecord)
            .where(
                LearningRecord.user_id == user.id,
                LearningRecord.created_at >= day_start,
                LearningRecord.created_at < day_end,
            )
        )
        count = result.scalar() or 0
        heatmap.append({"date": day.isoformat(), "count": count})

    # XP info
    xp = await get_or_create_xp(user.id, db)

    # Total stats
    result = await db.execute(
        select(
            func.count().label("total"),
            func.sum(case((LearningRecord.is_correct == True, 1), else_=0)).label("correct"),
        ).where(LearningRecord.user_id == user.id)
    )
    row = result.one()

    result = await db.execute(
        select(func.count()).select_from(UserVocabulary).where(UserVocabulary.user_id == user.id)
    )
    vocab_count = result.scalar() or 0

    result = await db.execute(
        select(func.count()).select_from(WritingSubmission).where(WritingSubmission.user_id == user.id)
    )
    writing_count = result.scalar() or 0

    await db.commit()

    return {
        "daily_accuracy": daily_accuracy,
        "heatmap": heatmap,
        "total_practice": row.total or 0,
        "total_correct": row.correct or 0,
        "vocab_count": vocab_count,
        "writing_count": writing_count,
        "level": xp.level,
        "total_xp": xp.total_xp,
        "xp_for_next": xp_for_level(xp.level + 1),
        "streak_days": xp.streak_days,
        "cefr": level_to_cefr(xp.level),
    }
