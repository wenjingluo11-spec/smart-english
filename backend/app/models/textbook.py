import datetime
from sqlalchemy import Integer, String, Text, ForeignKey, DateTime, func, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class TextbookVersion(Base):
    __tablename__ = "textbook_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))  # e.g. "人教版七年级上册"
    publisher: Mapped[str] = mapped_column(String(50))  # 人教版/外研版/北师大版
    grade: Mapped[str] = mapped_column(String(20))  # 七年级/八年级/九年级/高一/高二/高三
    semester: Mapped[str] = mapped_column(String(10))  # 上/下
    cover_url: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class TextbookUnit(Base):
    __tablename__ = "textbook_units"

    id: Mapped[int] = mapped_column(primary_key=True)
    textbook_id: Mapped[int] = mapped_column(ForeignKey("textbook_versions.id"), index=True)
    unit_number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    topic: Mapped[str] = mapped_column(String(100), default="")
    vocabulary_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # ["word1", "word2", ...]
    grammar_points_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # ["point1", "point2"]
    key_sentences_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # ["sentence1", ...]


class UserTextbookSetting(Base):
    __tablename__ = "user_textbook_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    textbook_id: Mapped[int] = mapped_column(ForeignKey("textbook_versions.id"))
    current_unit_id: Mapped[int | None] = mapped_column(ForeignKey("textbook_units.id"), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
