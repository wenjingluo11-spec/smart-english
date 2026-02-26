"""XP calculation, leveling, and achievement detection."""

import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.gamification import UserXP, Achievement
from app.models.learning import LearningRecord

# XP rewards per action
XP_TABLE = {
    "practice_correct": 10,
    "practice_wrong": 2,
    "writing": 25,
    "reading": 15,
    "vocab_review": 5,
    "screenshot": 20,
    "clinic_exercise": 8,
    "story_chapter": 30,
    "galaxy_explore": 5,
    "battle_win": 25,
    "quest_complete": 50,
    "diagnostic_complete": 30,
    "training_correct": 10,
    "mock_complete": 50,
    "breakthrough_complete": 40,
    # 新功能 XP
    "flow_question": 5,
    "flow_milestone_5": 10,
    "flow_milestone_10": 20,
    "flow_milestone_20": 40,
    "flow_milestone_50": 80,
    "flow_complete": 15,
    "time_on_budget": 5,
    "time_mastery_session": 15,
    "gene_fix": 30,
    "custom_quiz_complete": 20,
    "sprint_task_complete": 10,
    "sprint_all_done": 20,
}

# Level formula: xp_for_level(n) = n^2 * 50
def xp_for_level(n: int) -> int:
    return n * n * 50

def level_from_xp(total_xp: int) -> int:
    level = 1
    while xp_for_level(level + 1) <= total_xp:
        level += 1
    return level

CEFR_MAP = {
    (1, 10): "A1",
    (11, 20): "A2",
    (21, 30): "B1",
    (31, 40): "B2",
    (41, 50): "C1",
    (51, 60): "C2",
}

def level_to_cefr(level: int) -> str:
    for (lo, hi), cefr in CEFR_MAP.items():
        if lo <= level <= hi:
            return cefr
    return "C2"


async def get_or_create_xp(user_id: int, db: AsyncSession) -> UserXP:
    result = await db.execute(select(UserXP).where(UserXP.user_id == user_id))
    xp = result.scalar_one_or_none()
    if not xp:
        xp = UserXP(user_id=user_id, total_xp=0, level=1, streak_days=0)
        db.add(xp)
        await db.flush()
    return xp


async def award_xp(user_id: int, action: str, db: AsyncSession) -> dict:
    """Award XP for an action. Returns {"xp_gained", "total_xp", "level", "leveled_up", "new_achievements"}."""
    xp_gained = XP_TABLE.get(action, 0)
    xp_record = await get_or_create_xp(user_id, db)

    old_level = xp_record.level
    xp_record.total_xp += xp_gained
    xp_record.level = level_from_xp(xp_record.total_xp)

    # Update streak
    today = datetime.date.today().isoformat()
    if xp_record.last_active_date != today:
        yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
        if xp_record.last_active_date == yesterday:
            xp_record.streak_days += 1
        elif xp_record.last_active_date != today:
            xp_record.streak_days = 1
        xp_record.last_active_date = today

    leveled_up = xp_record.level > old_level

    # Check achievements
    new_achievements = await check_achievements(user_id, xp_record, db)

    await db.flush()

    return {
        "xp_gained": xp_gained,
        "total_xp": xp_record.total_xp,
        "level": xp_record.level,
        "cefr": level_to_cefr(xp_record.level),
        "leveled_up": leveled_up,
        "streak_days": xp_record.streak_days,
        "new_achievements": new_achievements,
    }


ACHIEVEMENT_DEFS = [
    {"key": "first_practice", "name": "初试锋芒", "desc": "完成第一道练习题", "icon": "⭐", "check": "practice_count", "threshold": 1},
    {"key": "practice_10", "name": "勤学苦练", "desc": "完成 10 道练习题", "icon": "📝", "check": "practice_count", "threshold": 10},
    {"key": "practice_50", "name": "题海战术", "desc": "完成 50 道练习题", "icon": "🎯", "check": "practice_count", "threshold": 50},
    {"key": "streak_3", "name": "三日连胜", "desc": "连续学习 3 天", "icon": "🔥", "check": "streak", "threshold": 3},
    {"key": "streak_7", "name": "周周不断", "desc": "连续学习 7 天", "icon": "💪", "check": "streak", "threshold": 7},
    {"key": "streak_30", "name": "月度坚持", "desc": "连续学习 30 天", "icon": "🏆", "check": "streak", "threshold": 30},
    {"key": "level_5", "name": "小有成就", "desc": "达到 5 级", "icon": "🌟", "check": "level", "threshold": 5},
    {"key": "level_10", "name": "渐入佳境", "desc": "达到 10 级", "icon": "💎", "check": "level", "threshold": 10},
]


async def check_achievements(user_id: int, xp_record: UserXP, db: AsyncSession) -> list[dict]:
    # Get existing achievement keys
    result = await db.execute(
        select(Achievement.key).where(Achievement.user_id == user_id)
    )
    existing = set(result.scalars().all())

    # Get practice count
    result = await db.execute(
        select(func.count()).select_from(LearningRecord).where(LearningRecord.user_id == user_id)
    )
    practice_count = result.scalar() or 0

    new_achievements = []
    for adef in ACHIEVEMENT_DEFS:
        if adef["key"] in existing:
            continue
        unlocked = False
        if adef["check"] == "practice_count" and practice_count >= adef["threshold"]:
            unlocked = True
        elif adef["check"] == "streak" and xp_record.streak_days >= adef["threshold"]:
            unlocked = True
        elif adef["check"] == "level" and xp_record.level >= adef["threshold"]:
            unlocked = True

        if unlocked:
            ach = Achievement(
                user_id=user_id,
                key=adef["key"],
                name=adef["name"],
                description=adef["desc"],
                icon=adef["icon"],
            )
            db.add(ach)
            new_achievements.append({"key": adef["key"], "name": adef["name"], "icon": adef["icon"]})

    return new_achievements
