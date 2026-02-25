import datetime
from sqlalchemy import String, Integer, Text, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    stage: Mapped[str] = mapped_column(String(10), index=True)  # 小学/初中/高中
    grade: Mapped[str] = mapped_column(String(20), index=True)
    topic: Mapped[str] = mapped_column(String(100), index=True)
    difficulty: Mapped[int] = mapped_column(Integer, default=3)  # 1-5
    question_type: Mapped[str] = mapped_column(String(50))  # 单选/填空/完形/阅读
    content: Mapped[str] = mapped_column(Text)
    options_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    answer: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text, default="")
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
