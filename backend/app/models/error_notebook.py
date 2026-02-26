import datetime
from sqlalchemy import Integer, String, Text, Boolean, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class ErrorNotebookEntry(Base):
    __tablename__ = "error_notebook_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    source_type: Mapped[str] = mapped_column(String(20), index=True)  # practice/exam/mock
    question_snapshot: Mapped[str] = mapped_column(Text)  # 题目内容快照
    question_type: Mapped[str] = mapped_column(String(50), default="")
    topic: Mapped[str] = mapped_column(String(100), default="")
    difficulty: Mapped[int] = mapped_column(Integer, default=3)
    user_answer: Mapped[str] = mapped_column(Text)
    correct_answer: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="unmastered", index=True)  # unmastered/mastered
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    question_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 原始题目 ID（可选）
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    mastered_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
