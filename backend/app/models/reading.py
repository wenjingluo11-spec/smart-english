import datetime
from sqlalchemy import String, Integer, Text, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class ReadingMaterial(Base):
    __tablename__ = "reading_materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    cefr_level: Mapped[str] = mapped_column(String(5), index=True)
    grade: Mapped[str] = mapped_column(String(20), index=True)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    questions_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
