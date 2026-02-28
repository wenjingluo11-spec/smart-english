from fastapi import APIRouter, Depends
from sqlalchemy import select, func, distinct, case, Integer
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.behavior import BehaviorEvent, CognitiveFeedbackRecord
from app.models.learning import LearningRecord

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

ENHANCEMENT_TYPES = ("demo_play", "tts_play", "highlight_click", "hint_request")

# Helper: average accuracy for a set of question_ids (or excluding them)
async def _avg_accuracy(db: AsyncSession, qids: list[int], include: bool) -> float:
    if not qids:
        return 0.0
    filt = LearningRecord.question_id.in_(qids) if include else LearningRecord.question_id.not_in(qids)
    correct_expr = case((LearningRecord.is_correct == True, 1), else_=0)  # noqa: E712
    r = await db.execute(select(func.avg(correct_expr)).where(filt))
    return float(r.scalar() or 0)


@router.get("/cognitive-stats")
async def cognitive_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # enhanced question ids (had demo_play)
    enhanced_ids = (await db.execute(
        select(distinct(BehaviorEvent.question_id))
        .where(BehaviorEvent.event_type == "demo_play", BehaviorEvent.question_id.is_not(None))
    )).scalars().all()

    acc_with = await _avg_accuracy(db, enhanced_ids, True)
    acc_without = await _avg_accuracy(db, enhanced_ids, False)
    lift_pct = round((acc_with - acc_without) / acc_without * 100, 1) if acc_without else 0.0

    # by question type (module)
    type_rows = (await db.execute(
        select(BehaviorEvent.module, func.count(BehaviorEvent.id))
        .where(BehaviorEvent.event_type.in_(ENHANCEMENT_TYPES))
        .group_by(BehaviorEvent.module)
    )).all()

    by_question_type = []
    for mod, usage_count in type_rows:
        avg_r = (await db.execute(
            select(func.avg(CognitiveFeedbackRecord.rating))
            .join(BehaviorEvent, BehaviorEvent.question_id == CognitiveFeedbackRecord.question_id)
            .where(BehaviorEvent.module == mod)
        )).scalar() or 0

        mod_qids = (await db.execute(
            select(distinct(BehaviorEvent.question_id))
            .where(BehaviorEvent.module == mod, BehaviorEvent.event_type.in_(ENHANCEMENT_TYPES),
                   BehaviorEvent.question_id.is_not(None))
        )).scalars().all()

        by_question_type.append({
            "type": mod, "usage_count": usage_count,
            "avg_rating": round(float(avg_r), 2),
            "accuracy_with": round(await _avg_accuracy(db, mod_qids, True), 2),
            "accuracy_without": round(await _avg_accuracy(db, mod_qids, False), 2),
        })

    # feature usage ratios
    total_ev = (await db.execute(select(func.count(BehaviorEvent.id)))).scalar() or 1
    feature_usage = {}
    for et, key in [("tts_play", "tts"), ("demo_play", "demo"), ("highlight_click", "highlight"), ("hint_request", "hint")]:
        cnt = (await db.execute(select(func.count(BehaviorEvent.id)).where(BehaviorEvent.event_type == et))).scalar() or 0
        feature_usage[key] = round(cnt / total_ev, 2)

    # aggregates
    total_users = (await db.execute(select(func.count(distinct(BehaviorEvent.user_id))))).scalar() or 0
    total_enhancements = (await db.execute(
        select(func.count(BehaviorEvent.id)).where(BehaviorEvent.event_type.in_(ENHANCEMENT_TYPES))
    )).scalar() or 0
    avg_feedback = (await db.execute(select(func.avg(CognitiveFeedbackRecord.rating)))).scalar() or 0

    return {
        "accuracy_lift": {
            "with_enhancement": round(acc_with, 2),
            "without_enhancement": round(acc_without, 2),
            "lift_pct": lift_pct,
        },
        "by_question_type": by_question_type,
        "feature_usage": feature_usage,
        "total_users": total_users,
        "total_enhancements": total_enhancements,
        "avg_feedback_rating": round(float(avg_feedback), 1),
    }
