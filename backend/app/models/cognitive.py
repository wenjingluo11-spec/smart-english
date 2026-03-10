import datetime
from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime, JSON, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class CognitiveSession(Base):
    __tablename__ = "cognitive_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    module: Mapped[str] = mapped_column(String(30), index=True)  # chat/exam/clinic/writing/...
    guidance_mode: Mapped[str] = mapped_column(String(20), default="socratic")  # socratic/mirror/hybrid
    status: Mapped[str] = mapped_column(String(20), default="active")  # active/completed
    context_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class CognitiveTurn(Base):
    __tablename__ = "cognitive_turns"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("cognitive_sessions.id"), index=True)
    turn_index: Mapped[int] = mapped_column(Integer, default=0, index=True)
    stage: Mapped[str] = mapped_column(String(20), default="present")  # present/query/reflect/refine
    role: Mapped[str] = mapped_column(String(20), default="user")  # user/assistant/system
    content: Mapped[str] = mapped_column(Text, default="")
    mirror_level: Mapped[str | None] = mapped_column(String(10), nullable=True)  # M0-M3
    zpd_band: Mapped[str | None] = mapped_column(String(20), nullable=True)  # easy/sweet/hard
    hint_used: Mapped[bool] = mapped_column(Boolean, default=False)
    meta_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ReflectionEntry(Base):
    __tablename__ = "reflection_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("cognitive_sessions.id"), index=True)
    turn_id: Mapped[int | None] = mapped_column(ForeignKey("cognitive_turns.id"), nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    reflection_text: Mapped[str] = mapped_column(Text, default="")
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class TeachingQualityMetric(Base):
    __tablename__ = "teaching_quality_metrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    session_id: Mapped[int | None] = mapped_column(ForeignKey("cognitive_sessions.id"), nullable=True, index=True)
    tqi_score: Mapped[float] = mapped_column(Float, default=0.0)
    coherence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    evidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    clarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    mirror_level: Mapped[str | None] = mapped_column(String(10), nullable=True)  # M0-M3
    details_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    measured_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class CognitiveGainSnapshot(Base):
    __tablename__ = "cognitive_gain_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    period_type: Mapped[str] = mapped_column(String(20), default="session")  # session/day/week
    period_key: Mapped[str | None] = mapped_column(String(30), nullable=True)
    baseline_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    cognitive_gain: Mapped[float] = mapped_column(Float, default=0.0)
    metrics_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
