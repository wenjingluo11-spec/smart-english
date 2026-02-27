"""学习行为追踪服务 — 事件采集、行为画像聚合、认知增强个性化。

V4.1: 行为事件批量写入 + 审题模式分析
V4.2: 根据行为画像调整认知增强强度
"""

import json
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.behavior import BehaviorEvent, UserBehaviorProfile


async def ingest_events(
    db: AsyncSession,
    user_id: int,
    session_id: str,
    events: list[dict],
) -> int:
    """批量写入行为事件。返回写入数量。"""
    records = []
    for e in events:
        records.append(BehaviorEvent(
            user_id=user_id,
            session_id=session_id,
            module=e.get("module", ""),
            question_id=e.get("question_id"),
            material_id=e.get("material_id"),
            event_type=e.get("event_type", ""),
            event_data=e.get("event_data"),
            timestamp_ms=e.get("timestamp_ms", 0),
            duration_ms=e.get("duration_ms"),
        ))
    db.add_all(records)
    await db.commit()
    return len(records)


async def get_or_create_profile(
    db: AsyncSession, user_id: int
) -> UserBehaviorProfile:
    """获取或创建用户行为画像。"""
    result = await db.execute(
        select(UserBehaviorProfile).where(UserBehaviorProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserBehaviorProfile(user_id=user_id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


async def update_behavior_profile(
    db: AsyncSession, user_id: int
) -> dict:
    """聚合最近行为事件，更新用户行为画像。"""
    profile = await get_or_create_profile(db, user_id)

    # 统计最近 500 个事件
    result = await db.execute(
        select(BehaviorEvent)
        .where(BehaviorEvent.user_id == user_id)
        .order_by(BehaviorEvent.created_at.desc())
        .limit(500)
    )
    events = result.scalars().all()
    if not events:
        return _profile_to_dict(profile)

    total = len(events)
    profile.total_events = total

    # 统计各类事件
    type_counts: dict[str, int] = {}
    question_times: list[int] = []
    for e in events:
        type_counts[e.event_type] = type_counts.get(e.event_type, 0) + 1
        if e.event_type == "question_view" and e.duration_ms:
            question_times.append(e.duration_ms)

    # 平均审题时间
    if question_times:
        profile.avg_question_time_ms = int(sum(question_times) / len(question_times))

    # 计算各功能使用比例（相对于 question_view 次数）
    q_views = type_counts.get("question_view", 1) or 1
    profile.reads_key_phrases = min(1.0, type_counts.get("highlight_click", 0) / q_views)
    profile.reads_distractors = min(1.0, type_counts.get("option_hover", 0) / q_views)
    profile.uses_tts = min(1.0, type_counts.get("tts_play", 0) / q_views)
    profile.uses_expert_demo = min(1.0, type_counts.get("demo_play", 0) / q_views)
    profile.uses_hints = min(1.0, type_counts.get("hint_request", 0) / q_views)

    # 推断认知增强偏好
    usage_score = (
        profile.uses_tts + profile.uses_expert_demo +
        profile.uses_hints + profile.reads_key_phrases
    )
    if usage_score < 0.5:
        profile.preferred_enhancement = "minimal"
    elif usage_score < 1.5:
        profile.preferred_enhancement = "balanced"
    else:
        profile.preferred_enhancement = "intensive"

    await db.commit()
    return _profile_to_dict(profile)


async def get_enhancement_config(
    db: AsyncSession, user_id: int
) -> dict:
    """V4.2: 根据用户行为画像返回个性化的认知增强配置。

    返回各模块的增强强度和推荐功能。
    """
    profile = await get_or_create_profile(db, user_id)

    pref = profile.preferred_enhancement

    # 基础配置
    config = {
        "level": pref,  # minimal / balanced / intensive
        "auto_tts": pref != "minimal",
        "auto_highlight": True,  # 题眼高亮始终开启
        "show_expert_demo": pref == "intensive",
        "auto_paragraph_review": pref != "minimal",
        "show_strategy_panel": pref != "minimal",
        "hint_delay_ms": {
            "minimal": 5000,
            "balanced": 3000,
            "intensive": 1500,
        }.get(pref, 3000),
        "recommendations": [],
    }

    # 个性化推荐
    if profile.reads_key_phrases < 0.2 and profile.total_events > 20:
        config["recommendations"].append({
            "type": "highlight",
            "message": "试试关注题目中的关键词高亮，它能帮你更快找到答案线索",
        })

    if profile.uses_tts < 0.1 and profile.total_events > 20:
        config["recommendations"].append({
            "type": "tts",
            "message": "听一听题目的朗读，有助于理解长难句",
        })

    if profile.uses_expert_demo < 0.1 and profile.total_events > 30:
        config["recommendations"].append({
            "type": "demo",
            "message": "看看学霸是怎么审题的，可能会给你新的思路",
        })

    if profile.avg_question_time_ms > 0 and profile.avg_question_time_ms < 5000:
        config["recommendations"].append({
            "type": "slow_down",
            "message": "你的审题速度很快，但可以多花几秒看看题眼和线索词",
        })

    return config


async def get_behavior_analytics(
    db: AsyncSession, user_id: int
) -> dict:
    """获取用户行为分析数据（用于管理后台和个人报告）。"""
    profile = await get_or_create_profile(db, user_id)

    # 最近7天事件分布
    from datetime import datetime, timedelta, timezone
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    result = await db.execute(
        select(
            BehaviorEvent.event_type,
            func.count().label("count"),
        )
        .where(
            BehaviorEvent.user_id == user_id,
            BehaviorEvent.created_at >= week_ago,
        )
        .group_by(BehaviorEvent.event_type)
    )
    event_distribution = {r[0]: r[1] for r in result.all()}

    # 模块使用分布
    result = await db.execute(
        select(
            BehaviorEvent.module,
            func.count().label("count"),
        )
        .where(
            BehaviorEvent.user_id == user_id,
            BehaviorEvent.created_at >= week_ago,
        )
        .group_by(BehaviorEvent.module)
    )
    module_distribution = {r[0]: r[1] for r in result.all()}

    return {
        "profile": _profile_to_dict(profile),
        "event_distribution": event_distribution,
        "module_distribution": module_distribution,
    }


def _profile_to_dict(p: UserBehaviorProfile) -> dict:
    return {
        "user_id": p.user_id,
        "avg_question_time_ms": p.avg_question_time_ms,
        "reads_key_phrases": round(p.reads_key_phrases, 3),
        "reads_distractors": round(p.reads_distractors, 3),
        "uses_tts": round(p.uses_tts, 3),
        "uses_expert_demo": round(p.uses_expert_demo, 3),
        "uses_hints": round(p.uses_hints, 3),
        "preferred_enhancement": p.preferred_enhancement,
        "enhancement_effectiveness": round(p.enhancement_effectiveness, 3),
        "total_events": p.total_events,
    }
