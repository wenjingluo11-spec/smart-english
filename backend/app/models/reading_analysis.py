"""阅读理解认知增强数据模型 — 缓存 AI 对文章的深度分析结果。

V3.1: 分段分析、长难句拆解、题文关联定位。
"""

import datetime
from sqlalchemy import Integer, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class ReadingAnalysis(Base):
    """文章认知增强分析缓存 — 避免重复调用 LLM。"""
    __tablename__ = "reading_analyses"

    id: Mapped[int] = mapped_column(primary_key=True)
    material_id: Mapped[int] = mapped_column(Integer, index=True, unique=True)
    # 分段分析：每段的主题句、关键词、难度
    paragraphs_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 长难句拆解：主干/修饰成分标注
    complex_sentences_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 题文关联：每道题对应原文哪个段落/句子
    question_mapping_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 文章核心信息摘要
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 文章结构分析（总分总/对比/因果等）
    structure_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
