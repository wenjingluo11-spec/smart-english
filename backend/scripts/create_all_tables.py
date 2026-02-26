"""建表脚本：创建所有 Phase 1-3 新增表。"""

import asyncio
from app.models import Base
from app.models.user import User  # noqa: F401
from app.models.question import Question  # noqa: F401
from app.models.learning import LearningRecord  # noqa: F401
from app.models.writing import WritingSubmission  # noqa: F401
from app.models.reading import ReadingMaterial  # noqa: F401
from app.models.vocabulary import UserVocabulary  # noqa: F401
from app.models.gamification import UserXP, Achievement, DailyMission  # noqa: F401
from app.models.screenshot import ScreenshotLesson  # noqa: F401
from app.models.clinic import ErrorPattern, TreatmentPlan  # noqa: F401
from app.models.story import StoryTemplate, StorySession, StoryChapter  # noqa: F401
from app.models.knowledge import KnowledgeNode, KnowledgeEdge, UserNodeStatus  # noqa: F401
from app.models.arena import BattleSession, PlayerRating  # noqa: F401
from app.models.quest import QuestTemplate, UserQuest  # noqa: F401
from app.database import engine


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ 所有数据库表已创建/更新")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
