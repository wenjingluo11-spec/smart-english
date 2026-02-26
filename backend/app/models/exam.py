"""考试冲刺系统数据模型。"""

import datetime
from sqlalchemy import Boolean, Integer, Float, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class ExamProfile(Base):
    __tablename__ = "exam_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    exam_type: Mapped[str] = mapped_column(String(20))  # zhongkao / gaokao
    province: Mapped[str] = mapped_column(String(20), default="通用")
    target_score: Mapped[int] = mapped_column(Integer, default=140)
    exam_date: Mapped[str] = mapped_column(String(10))  # YYYY-MM-DD
    current_estimated_score: Mapped[int] = mapped_column(Integer, default=0)
    plan_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class DiagnosticSession(Base):
    __tablename__ = "diagnostic_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    exam_type: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    questions_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    answers_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_analysis_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class ExamKnowledgePoint(Base):
    __tablename__ = "exam_knowledge_points"

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_type: Mapped[str] = mapped_column(String(20), index=True)
    section: Mapped[str] = mapped_column(String(30), index=True)
    category: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text, default="")
    difficulty: Mapped[int] = mapped_column(Integer, default=3)
    frequency: Mapped[str] = mapped_column(String(10), default="medium")  # high/medium/low
    tips_json: Mapped[str | None] = mapped_column(Text, nullable=True)


class KnowledgeMastery(Base):
    __tablename__ = "knowledge_masteries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    knowledge_point_id: Mapped[int] = mapped_column(
        ForeignKey("exam_knowledge_points.id"), index=True
    )
    mastery_level: Mapped[float] = mapped_column(Float, default=0.0)
    total_attempts: Mapped[int] = mapped_column(Integer, default=0)
    correct_attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_practiced_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    next_review_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_type: Mapped[str] = mapped_column(String(20), index=True)
    section: Mapped[str] = mapped_column(String(30), index=True)
    knowledge_point_id: Mapped[int | None] = mapped_column(
        ForeignKey("exam_knowledge_points.id"), nullable=True, index=True
    )
    difficulty: Mapped[int] = mapped_column(Integer, default=3)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    province: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # passage_group: 同一篇章下的题目共享同一个 group id（如 "reading_topic_xxx_001"）
    passage_group: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    passage_index: Mapped[int] = mapped_column(Integer, default=0)  # 篇章内题目序号
    source_id: Mapped[str | None] = mapped_column(String(60), nullable=True)  # edu-distill 原始 id
    content: Mapped[str] = mapped_column(Text)
    passage_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    options_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    answer: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text, default="")
    strategy_tip: Mapped[str] = mapped_column(Text, default="")
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)


class MockExam(Base):
    __tablename__ = "mock_exams"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    exam_type: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    time_limit_minutes: Mapped[int] = mapped_column(Integer, default=120)
    sections_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    answers_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    score_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_report_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class WeaknessBreakthrough(Base):
    __tablename__ = "weakness_breakthroughs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    knowledge_point_id: Mapped[int] = mapped_column(
        ForeignKey("exam_knowledge_points.id"), index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="pending")
    phase: Mapped[int] = mapped_column(Integer, default=1)
    micro_lesson_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    exercises_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_exercises: Mapped[int] = mapped_column(Integer, default=0)
    completed_exercises: Mapped[int] = mapped_column(Integer, default=0)
    mastery_before: Mapped[float] = mapped_column(Float, default=0.0)
    mastery_after: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ScorePrediction(Base):
    __tablename__ = "score_predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    exam_type: Mapped[str] = mapped_column(String(20))
    predicted_score: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    section_predictions_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    factors_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


# ── 心流刷题 ──

class FlowSession(Base):
    __tablename__ = "flow_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    exam_type: Mapped[str] = mapped_column(String(20))
    section: Mapped[str] = mapped_column(String(30))
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    max_streak: Mapped[int] = mapped_column(Integer, default=0)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    current_difficulty: Mapped[int] = mapped_column(Integer, default=3)
    avg_response_ms: Mapped[int] = mapped_column(Integer, default=0)
    difficulty_curve_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active / completed
    started_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


# ── 时间沙漏 ──

class ExamTimeRecord(Base):
    __tablename__ = "exam_time_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    session_type: Mapped[str] = mapped_column(String(20))  # training / mock / flow
    session_id: Mapped[int] = mapped_column(Integer)
    time_data_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    on_budget_rate: Mapped[float] = mapped_column(Float, default=0.0)
    ai_analysis_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


# ── 错题基因 ──

class ErrorGene(Base):
    __tablename__ = "error_genes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    pattern_key: Mapped[str] = mapped_column(String(100), index=True)
    pattern_description: Mapped[str] = mapped_column(Text)
    section: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20), default="active")  # active / improving / fixed
    example_ids_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    fix_exercises_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    fix_attempts: Mapped[int] = mapped_column(Integer, default=0)
    fix_correct: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# ── AI 出题官 ──

class CustomQuizSession(Base):
    __tablename__ = "custom_quiz_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    exam_type: Mapped[str] = mapped_column(String(20))
    user_prompt: Mapped[str] = mapped_column(Text)
    section: Mapped[str] = mapped_column(String(30), default="mixed")
    difficulty: Mapped[int] = mapped_column(Integer, default=3)
    generated_questions_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    answers_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[int] = mapped_column(Integer, default=0)
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    feedback_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="generated")  # generated / completed
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


# ── 每日冲刺计划 ──

class DailySprintPlan(Base):
    __tablename__ = "daily_sprint_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    plan_date: Mapped[str] = mapped_column(String(10), index=True)  # YYYY-MM-DD
    tasks_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_count: Mapped[int] = mapped_column(Integer, default=0)
    completed_count: Mapped[int] = mapped_column(Integer, default=0)
    is_completed: Mapped[bool] = mapped_column(default=False)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
