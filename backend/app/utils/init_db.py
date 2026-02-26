"""初始化脚本：建表 + 创建测试用户 + 导入英语数据。

用法：
    cd backend && source .venv/bin/activate
    python -m app.utils.init_db [--data-dir /path/to/validated]
"""

import asyncio
import sys
from pathlib import Path

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
from app.models.exam import (  # noqa: F401
    ExamProfile, DiagnosticSession, ExamKnowledgePoint, KnowledgeMastery,
    ExamQuestion, MockExam, WeaknessBreakthrough, ScorePrediction,
)
from app.database import engine, async_session
from app.services.auth import hash_password
from app.utils.data_import import import_jsonl


async def main():
    # 1. 建表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ 数据库表已创建")

    async with async_session() as db:
        # 2. 创建测试用户（如果不存在）
        from sqlalchemy import select

        result = await db.execute(select(User).where(User.phone == "13800000001"))
        if not result.scalar_one_or_none():
            test_user = User(
                phone="13800000001",
                hashed_password=hash_password("test123"),
                grade_level="初中",
                grade="八年级",
                cefr_level="A2",
            )
            db.add(test_user)
            await db.commit()
            print("✓ 测试用户已创建: 13800000001 / test123")
        else:
            print("✓ 测试用户已存在: 13800000001")

        # 3. 导入英语数据
        data_dir = None
        for i, arg in enumerate(sys.argv):
            if arg == "--data-dir" and i + 1 < len(sys.argv):
                data_dir = sys.argv[i + 1]

        if not data_dir:
            # 默认路径
            default = Path(__file__).resolve().parent.parent.parent.parent.parent / "edu-distill" / "data" / "validated"
            if default.exists():
                data_dir = str(default)

        if data_dir:
            root = Path(data_dir)
            # 只导入英语科目
            files = list(root.rglob("英语/*.jsonl"))
            if files:
                # 检查是否已有数据
                count_result = await db.execute(select(Question).limit(1))
                if count_result.scalar_one_or_none():
                    print("✓ 题目数据已存在，跳过导入")
                else:
                    total = 0
                    for f in files:
                        try:
                            count = await import_jsonl(f, db)
                            total += count
                            print(f"  ✓ {f.relative_to(root)} — {count} 条")
                        except Exception as e:
                            print(f"  ✗ {f.relative_to(root)} — {e}")
                    print(f"✓ 英语题目导入完成，共 {total} 条")
            else:
                print(f"⚠ 未找到英语 JSONL 文件: {root}")
        else:
            print("⚠ 未指定数据目录，跳过数据导入")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
