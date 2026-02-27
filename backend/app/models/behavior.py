"""学习行为追踪数据模型 — 记录用户在题目上的细粒度交互行为。

V4.1: 行为事件追踪 + 审题模式分析。
"""

import datetime
from sqlalchemy import Integer, String, Text, ForeignKey, DateTime, Date, Float, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class BehaviorEvent(Base):
    """用户行为事件 — 细粒度交互追踪。"""
    __tablename__ = "behavior_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    # 事件上下文
    module: Mapped[str] = mapped_column(String(30), index=True)  # practice/reading/writing/exam/grammar
    question_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    material_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # 事件类型
    event_type: Mapped[str] = mapped_column(String(50), index=True)
    # question_view / option_click / option_hover / passage_scroll
    # highlight_click / demo_play / demo_pause / tts_play
    # answer_submit / answer_change / hint_request / evidence_view
    # paragraph_focus / sentence_parse_view / back_to_passage
    # 事件数据
    event_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # 时间信息
    timestamp_ms: Mapped[int] = mapped_column(Integer)  # 客户端时间戳
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 事件持续时间
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class UserBehaviorProfile(Base):
    """用户行为画像 — 聚合分析结果，定期更新。"""
    __tablename__ = "user_behavior_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True, index=True)
    # 审题模式分析
    avg_question_time_ms: Mapped[int] = mapped_column(Integer, default=0)
    reads_key_phrases: Mapped[float] = mapped_column(Float, default=0.0)  # 0-1 看题眼的比例
    reads_distractors: Mapped[float] = mapped_column(Float, default=0.0)  # 0-1 看干扰项的比例
    uses_tts: Mapped[float] = mapped_column(Float, default=0.0)  # 0-1 使用语音的比例
    uses_expert_demo: Mapped[float] = mapped_column(Float, default=0.0)  # 0-1 看学霸演示的比例
    uses_hints: Mapped[float] = mapped_column(Float, default=0.0)  # 0-1 请求提示的比例
    # 认知增强偏好
    preferred_enhancement: Mapped[str] = mapped_column(String(30), default="balanced")
    # minimal / balanced / intensive
    enhancement_effectiveness: Mapped[float] = mapped_column(Float, default=0.0)  # 认知增强后正确率提升
    # 弱点模式
    weak_patterns_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 更新时间
    total_events: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CognitiveKnowledgeBase(Base):
    """认知增强知识库 — 每种题型的最佳审题策略沉淀。"""
    __tablename__ = "cognitive_knowledge_base"

    id: Mapped[int] = mapped_column(primary_key=True)
    # 题型维度
    question_type: Mapped[str] = mapped_column(String(50), index=True)  # 单选/完形/阅读/语法填空
    topic: Mapped[str] = mapped_column(String(100), default="")  # 具体知识点
    difficulty: Mapped[int] = mapped_column(Integer, default=3)
    # 策略数据
    best_strategy_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # {strategy_name, description, success_rate, sample_count}
    common_errors_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # [{error_pattern, frequency, fix_suggestion}]
    effective_clues_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # [{clue_type, effectiveness_score, example}]
    # 来源统计
    human_annotation_count: Mapped[int] = mapped_column(Integer, default=0)
    ai_analysis_count: Mapped[int] = mapped_column(Integer, default=0)
    user_behavior_count: Mapped[int] = mapped_column(Integer, default=0)
    avg_success_rate: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
