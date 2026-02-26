from pydantic import BaseModel


class QuestTemplateOut(BaseModel):
    id: int
    title: str
    description: str
    difficulty: int
    category: str
    requirements: dict | None = None
    tips: dict | None = None
    xp_reward: int


class UserQuestOut(BaseModel):
    id: int
    template_id: int
    template_title: str = ""
    status: str
    evidence_url: str | None = None
    ai_verification: dict | None = None
    started_at: str
    completed_at: str | None = None


class QuestSubmitRequest(BaseModel):
    evidence_url: str


class QuestVerificationResult(BaseModel):
    passed: bool
    feedback: str
    score: int
    xp: dict | None = None
