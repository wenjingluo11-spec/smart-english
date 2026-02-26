import datetime
from sqlalchemy import Integer, String, ForeignKey, DateTime, Date, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class LearningTimeLog(Base):
    __tablename__ = "learning_time_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    module: Mapped[str] = mapped_column(String(30), index=True)  # practice/reading/writing/vocabulary/exam/tutor/story/grammar
    duration_seconds: Mapped[int] = mapped_column(Integer, default=60)
    date: Mapped[datetime.date] = mapped_column(Date, index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
