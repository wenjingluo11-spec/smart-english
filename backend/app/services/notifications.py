"""通知服务 - 创建通知的工具函数。"""

from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification


async def create_notification(
    user_id: int,
    title: str,
    content: str = "",
    category: str = "system",
    link: str = "",
    db: AsyncSession = None,
) -> Notification:
    n = Notification(
        user_id=user_id,
        title=title,
        content=content,
        category=category,
        link=link,
    )
    if db:
        db.add(n)
    return n


async def notify_review_due(user_id: int, due_count: int, db: AsyncSession):
    """提醒用户有待复习的单词。"""
    return await create_notification(
        user_id=user_id,
        title=f"你有 {due_count} 个单词待复习",
        content="及时复习可以巩固记忆效果哦！",
        category="review",
        link="/vocabulary",
        db=db,
    )


async def notify_achievement(user_id: int, achievement: str, db: AsyncSession):
    """成就解锁通知。"""
    return await create_notification(
        user_id=user_id,
        title=f"成就解锁：{achievement}",
        content="继续加油！",
        category="achievement",
        link="/profile",
        db=db,
    )


async def notify_streak(user_id: int, days: int, db: AsyncSession):
    """连续学习天数通知。"""
    return await create_notification(
        user_id=user_id,
        title=f"连续学习 {days} 天！",
        content="坚持就是胜利，继续保持！",
        category="streak",
        link="/",
        db=db,
    )
