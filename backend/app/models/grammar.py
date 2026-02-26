import datetime
from sqlalchemy import Integer, String, Text, ForeignKey, DateTime, func, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class GrammarTopic(Base):
    __tablename__ = "grammar_topics"

    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[str] = mapped_column(String(50), index=True)  # 时态/从句/非谓语/情态动词/...
    name: Mapped[str] = mapped_column(String(100))  # e.g. "一般现在时"
    difficulty: Mapped[int] = mapped_column(Integer, default=1)  # 1-5
    cefr_level: Mapped[str] = mapped_column(String(5), default="A1")
    explanation: Mapped[str] = mapped_column(Text, default="")
    examples_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # ["example1", ...]
    tips_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # ["tip1", ...]
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class GrammarExercise(Base):
    __tablename__ = "grammar_exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("grammar_topics.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    options_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    answer: Mapped[str] = mapped_column(String(500))
    explanation: Mapped[str] = mapped_column(Text, default="")
    exercise_type: Mapped[str] = mapped_column(String(30), default="choice")  # choice/fill/rewrite/correct


class UserGrammarProgress(Base):
    __tablename__ = "user_grammar_progress"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("grammar_topics.id"), index=True)
    total_attempts: Mapped[int] = mapped_column(Integer, default=0)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    mastery: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    last_practiced_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
