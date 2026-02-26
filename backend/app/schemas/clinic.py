from pydantic import BaseModel


class ErrorPatternOut(BaseModel):
    id: int
    pattern_type: str
    title: str
    description: str
    severity: str
    evidence_json: dict | None = None
    diagnosis_json: dict | None = None
    status: str
    created_at: str


class DiagnosisReport(BaseModel):
    patterns: list[ErrorPatternOut]
    summary: str
    total_errors_analyzed: int


class TreatmentPlanOut(BaseModel):
    id: int
    pattern_id: int
    exercises_json: dict | None = None
    total_exercises: int
    completed_exercises: int
    status: str


class TreatmentExerciseSubmit(BaseModel):
    plan_id: int
    exercise_index: int
    answer: str


class TreatmentExerciseResult(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str
    progress: int
    total: int
    plan_completed: bool
    xp: dict | None = None
