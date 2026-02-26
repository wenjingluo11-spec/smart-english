"""Daily mission generation based on user weaknesses and review schedule."""

import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.gamification import DailyMission
from app.models.learning import LearningRecord
from app.models.vocabulary import UserVocabulary
from app.models.writing import WritingSubmission


async def get_or_generate_missions(user_id: int, db: AsyncSession) -> list[DailyMission]:
    """Get today's missions, generating them if they don't exist yet."""
    today = datetime.date.today().isoformat()

    result = await db.execute(
        select(DailyMission)
        .where(DailyMission.user_id == user_id, DailyMission.date == today)
    )
    missions = list(result.scalars().all())
    if missions:
        return missions

    # Generate new missions for today
    missions = await _generate_missions(user_id, today, db)
    return missions


async def _generate_missions(user_id: int, today: str, db: AsyncSession) -> list[DailyMission]:
    missions = []

    # Mission 1: Practice questions (always)
    # Check how many wrong answers recently to adjust target
    result = await db.execute(
        select(func.count()).select_from(LearningRecord)
        .where(LearningRecord.user_id == user_id, LearningRecord.is_correct == False)
    )
    wrong_count = result.scalar() or 0
    practice_target = 5 if wrong_count > 10 else 3

    missions.append(DailyMission(
        user_id=user_id, date=today,
        mission_type="practice",
        title=f"完成 {practice_target} 道练习题",
        target=practice_target, xp_reward=20,
    ))

    # Mission 2: Vocabulary review (if there are words to review)
    now = datetime.datetime.now(datetime.timezone.utc)
    result = await db.execute(
        select(func.count()).select_from(UserVocabulary)
        .where(
            UserVocabulary.user_id == user_id,
            (UserVocabulary.next_review_at <= now) | (UserVocabulary.next_review_at.is_(None)),
            UserVocabulary.status != "mastered",
        )
    )
    due_count = result.scalar() or 0
    if due_count > 0:
        review_target = min(due_count, 10)
        missions.append(DailyMission(
            user_id=user_id, date=today,
            mission_type="review",
            title=f"复习 {review_target} 个单词",
            target=review_target, xp_reward=15,
        ))

    # Mission 3: Writing (if no recent submission)
    result = await db.execute(
        select(func.count()).select_from(WritingSubmission)
        .where(WritingSubmission.user_id == user_id)
    )
    writing_count = result.scalar() or 0
    if writing_count < 3 or writing_count % 3 == 0:
        missions.append(DailyMission(
            user_id=user_id, date=today,
            mission_type="writing",
            title="提交一篇写作练习",
            target=1, xp_reward=30,
        ))

    # Mission 4: Reading (always good to read)
    missions.append(DailyMission(
        user_id=user_id, date=today,
        mission_type="reading",
        title="阅读一篇文章",
        target=1, xp_reward=15,
    ))

    # Mission 5: Exam training (if user has exam profile)
    from app.models.exam import ExamProfile
    profile_result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user_id)
    )
    if profile_result.scalar_one_or_none():
        missions.append(DailyMission(
            user_id=user_id, date=today,
            mission_type="exam_training",
            title="完成 5 道考试专项训练",
            target=5, xp_reward=25,
        ))
        missions.append(DailyMission(
            user_id=user_id, date=today,
            mission_type="exam_review",
            title="突破 1 个薄弱知识点",
            target=1, xp_reward=30,
        ))

    for m in missions:
        db.add(m)
    await db.flush()
    return missions


async def update_mission_progress(user_id: int, mission_type: str, db: AsyncSession) -> dict | None:
    """Increment progress for a mission type. Returns mission info if completed."""
    today = datetime.date.today().isoformat()
    result = await db.execute(
        select(DailyMission)
        .where(
            DailyMission.user_id == user_id,
            DailyMission.date == today,
            DailyMission.mission_type == mission_type,
            DailyMission.completed == False,
        )
    )
    mission = result.scalar_one_or_none()
    if not mission:
        return None

    mission.progress = min(mission.progress + 1, mission.target)
    if mission.progress >= mission.target:
        mission.completed = True
        await db.flush()
        return {"completed": True, "title": mission.title, "xp_reward": mission.xp_reward}

    await db.flush()
    return {"completed": False, "title": mission.title, "progress": mission.progress, "target": mission.target}
