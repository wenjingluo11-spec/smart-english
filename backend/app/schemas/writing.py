from pydantic import BaseModel


class WritingSubmitRequest(BaseModel):
    prompt: str
    content: str


class WritingFeedback(BaseModel):
    id: int
    score: int | None
    feedback_json: dict | None
    created_at: str
