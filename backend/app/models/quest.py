import datetime
from sqlalchemy import Integer, String, ForeignKey, DateTime, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class QuestTemplate(Base):
    __tablename__ = "quest_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    difficulty: Mapped[int] = mapped_column(Integer, default=1)  # 1-3 (日常/挑战/史诗)
    category: Mapped[str] = mapped_column(String(50))  # digital/writing/social/media
    requirements_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    tips_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    xp_reward: Mapped[int] = mapped_column(Integer, default=50)
    achievement_key: Mapped[str | None] = mapped_column(String(50), nullable=True)


class UserQuest(Base):
    __tablename__ = "user_quests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("quest_templates.id"))
    status: Mapped[str] = mapped_column(String(20), default="active")  # active/submitted/verified/failed
    evidence_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ai_verification_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
