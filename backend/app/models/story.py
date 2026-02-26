import datetime
from sqlalchemy import Integer, String, ForeignKey, DateTime, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class StoryTemplate(Base):
    __tablename__ = "story_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    genre: Mapped[str] = mapped_column(String(50))  # mystery/scifi/campus/fantasy/detective
    cefr_min: Mapped[str] = mapped_column(String(5), default="A2")
    cefr_max: Mapped[str] = mapped_column(String(5), default="B2")
    synopsis: Mapped[str] = mapped_column(Text, default="")
    cover_emoji: Mapped[str] = mapped_column(String(10), default="📖")
    opening_prompt: Mapped[str] = mapped_column(Text, default="")


class StorySession(Base):
    __tablename__ = "story_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("story_templates.id"))
    current_chapter: Mapped[int] = mapped_column(Integer, default=1)
    total_chapters: Mapped[int] = mapped_column(Integer, default=0)
    character_memory_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    story_state_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active/completed/abandoned
    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class StoryChapter(Base):
    __tablename__ = "story_chapters"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("story_sessions.id"), index=True)
    chapter_number: Mapped[int] = mapped_column(Integer)
    narrative_text: Mapped[str] = mapped_column(Text, default="")
    choices_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    challenge_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    chosen_option: Mapped[str | None] = mapped_column(String(10), nullable=True)
    learning_points_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
