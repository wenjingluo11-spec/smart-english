from pydantic import BaseModel


class PracticeQuery(BaseModel):
    topic: str | None = None
    difficulty: int | None = None
    question_type: str | None = None
    limit: int = 10


class SubmitAnswer(BaseModel):
    question_id: int
    answer: str
    time_spent: int = 0


class SubmitResult(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str
