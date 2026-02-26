from pydantic import BaseModel, ConfigDict


class PracticeQuery(BaseModel):
    topic: str | None = None
    difficulty: int | None = None
    question_type: str | None = None
    limit: int = 10


class SubmitAnswer(BaseModel):
    question_id: int
    answer: str
    time_spent: int = 0


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    topic: str
    difficulty: int
    question_type: str
    content: str
    options_json: dict | None = None
    answer: str
    explanation: str = ""
    grade: str


class SubmitResult(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str
