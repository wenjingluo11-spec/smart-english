from pydantic import BaseModel


class ScreenshotAnalysisResponse(BaseModel):
    id: int
    image_url: str
    source_type: str
    extracted_text: str | None = None
    analysis: dict | None = None
    created_at: str


class ScreenshotExerciseSubmit(BaseModel):
    lesson_id: int
    exercise_index: int
    answer: str


class ScreenshotExerciseResult(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str
    xp: dict | None = None
