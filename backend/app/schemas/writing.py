from pydantic import BaseModel


class WritingSubmitRequest(BaseModel):
    prompt: str
    content: str
    student_points: list[str] | None = None
    draft_content: str | None = None
    revised_content: str | None = None
    revision_reflection: str | None = None


class WritingFeedback(BaseModel):
    id: int
    score: int | None
    feedback_json: dict | None
    created_at: str
