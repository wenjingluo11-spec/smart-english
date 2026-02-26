import datetime
from sqlalchemy import Integer, String, ForeignKey, DateTime, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class ScreenshotLesson(Base):
    __tablename__ = "screenshot_lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    image_url: Mapped[str] = mapped_column(String(500))
    source_type: Mapped[str] = mapped_column(String(50), default="other")  # game/social/web/other
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    analysis_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
