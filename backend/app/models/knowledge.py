import datetime
from sqlalchemy import Integer, String, ForeignKey, DateTime, Text, JSON, Float, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class KnowledgeNode(Base):
    __tablename__ = "knowledge_nodes"

    id: Mapped[int] = mapped_column(primary_key=True)
    word: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    pos: Mapped[str] = mapped_column(String(20), default="")  # noun/verb/adj/adv
    definition: Mapped[str] = mapped_column(Text, default="")  # 中文释义
    definition_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    cefr_level: Mapped[str] = mapped_column(String(5), default="A1")
    frequency_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    example_sentence: Mapped[str | None] = mapped_column(Text, nullable=True)


class KnowledgeEdge(Base):
    __tablename__ = "knowledge_edges"

    id: Mapped[int] = mapped_column(primary_key=True)
    source_node_id: Mapped[int] = mapped_column(ForeignKey("knowledge_nodes.id"), index=True)
    target_node_id: Mapped[int] = mapped_column(ForeignKey("knowledge_nodes.id"), index=True)
    relation_type: Mapped[str] = mapped_column(String(30))  # synonym/antonym/family/collocation/derived
    weight: Mapped[float] = mapped_column(Float, default=1.0)


class UserNodeStatus(Base):
    __tablename__ = "user_node_status"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    node_id: Mapped[int] = mapped_column(ForeignKey("knowledge_nodes.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="undiscovered")  # undiscovered/seen/familiar/mastered
    encounter_count: Mapped[int] = mapped_column(Integer, default=0)
    last_seen: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
