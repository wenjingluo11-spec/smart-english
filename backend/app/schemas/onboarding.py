from pydantic import BaseModel


class AssessmentSubmit(BaseModel):
    answers: list[dict]  # [{"question_index": 0, "answer": "B"}, ...]


class GoalsSubmit(BaseModel):
    daily_goal_minutes: int = 30
    target_exam: str | None = None  # zhongkao/gaokao/none


class OnboardingStatusOut(BaseModel):
    completed: bool
    current_step: str | None = None  # assessment/result/goals/tour/done
    assessment_score: int | None = None
    cefr_level: str | None = None
    recommended_path: str | None = None
