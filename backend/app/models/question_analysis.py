"""题眼分析数据模型 — 缓存 AI 对题目的认知增强分析结果。"""

import datetime
from sqlalchemy import Integer, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class QuestionAnalysis(Base):
    __tablename__ = "question_analyses"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    question_hash: Mapped[str] = mapped_column(String(64), index=True, unique=True)
    question_type: Mapped[str] = mapped_column(String(30), default="")
    key_phrases_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    reading_order_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    strategy: Mapped[str] = mapped_column(Text, default="")
    distractors_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # V3: 题眼 — 独立标注题目中最关键的解题信息
    question_eye_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # V2: 审题轨迹 — 模拟学霸眼睛看题的时间轴序列
    gaze_path_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # V2: 审题旁白 — 学霸审题时的内心独白文本（用于 TTS 朗读）
    narration: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class HumanAnnotation(Base):
    """人工标注的审题数据 — 真人学霸标注的审题过程，用于训练和展示。"""
    __tablename__ = "human_annotations"

    id: Mapped[int] = mapped_column(primary_key=True)
    annotator_id: Mapped[int] = mapped_column(Integer, index=True)
    question_id: Mapped[int] = mapped_column(Integer, index=True)
    gaze_path_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    narration: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    quality_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
