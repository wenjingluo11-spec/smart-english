import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(128))
    grade_level: Mapped[str] = mapped_column(String(10), default="初中")  # 小学/初中/高中
    grade: Mapped[str] = mapped_column(String(20), default="七年级")
    cefr_level: Mapped[str] = mapped_column(String(5), default="A1")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
