from pydantic import BaseModel


class ErrorEntryOut(BaseModel):
    id: int
    source_type: str
    question_snapshot: str
    question_type: str
    topic: str
    difficulty: int
    user_answer: str
    correct_answer: str
    explanation: str
    status: str
    retry_count: int
    created_at: str

    class Config:
        from_attributes = True


class ErrorStatsOut(BaseModel):
    total: int
    unmastered: int
    mastered: int
    by_topic: list[dict]
    by_type: list[dict]
    recent_trend: list[dict]


class RetryAnswerRequest(BaseModel):
    answer: str
