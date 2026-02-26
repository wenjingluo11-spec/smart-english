import datetime
from sqlalchemy import Integer, String, ForeignKey, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class BattleSession(Base):
    __tablename__ = "battle_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    mode: Mapped[str] = mapped_column(String(30))  # word_chain/debate/story_relay/spot_error/translation
    player1_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    player2_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="waiting")  # waiting/active/finished
    rounds_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    winner_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class PlayerRating(Base):
    __tablename__ = "player_ratings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    rating: Mapped[int] = mapped_column(Integer, default=1000)
    tier: Mapped[str] = mapped_column(String(20), default="bronze")  # bronze/silver/gold/diamond/champion
    wins: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)
    season: Mapped[int] = mapped_column(Integer, default=1)
