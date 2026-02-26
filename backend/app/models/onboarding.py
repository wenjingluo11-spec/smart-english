import datetime
from sqlalchemy import Integer, String, Text, Boolean, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class OnboardingProfile(Base):
    __tablename__ = "onboarding_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    assessment_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    assessment_result_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    recommended_path: Mapped[str | None] = mapped_column(String(50), nullable=True)
    daily_goal_minutes: Mapped[int] = mapped_column(Integer, default=30)
    target_exam: Mapped[str | None] = mapped_column(String(50), nullable=True)  # zhongkao/gaokao/none
    completed_steps_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # ["assessment", "goals", "tour"]
    completed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
