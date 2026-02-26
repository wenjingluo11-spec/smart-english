import datetime
from sqlalchemy import Integer, String, ForeignKey, DateTime, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class ErrorPattern(Base):
    __tablename__ = "error_patterns"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    pattern_type: Mapped[str] = mapped_column(String(50))  # grammar/vocabulary/l1_transfer/spelling
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(20), default="moderate")  # mild/moderate/severe
    evidence_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    diagnosis_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active/treating/resolved
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class TreatmentPlan(Base):
    __tablename__ = "treatment_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    pattern_id: Mapped[int] = mapped_column(ForeignKey("error_patterns.id"), index=True)
    exercises_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    total_exercises: Mapped[int] = mapped_column(Integer, default=0)
    completed_exercises: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/in_progress/completed
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
