"""考试冲刺系统 Pydantic schemas。"""

from pydantic import BaseModel


# ── 考试档案 ──
class ExamProfileCreate(BaseModel):
    exam_type: str  # zhongkao / gaokao
    province: str = "通用"
    target_score: int = 140
    exam_date: str  # YYYY-MM-DD


class ExamProfileOut(BaseModel):
    id: int
    exam_type: str
    province: str
    target_score: int
    exam_date: str
    current_estimated_score: int
    plan_json: dict | None = None


# ── 诊断测试 ──
class DiagnosticStartRequest(BaseModel):
    exam_type: str


class DiagnosticSubmitRequest(BaseModel):
    session_id: int
    answers: list[dict]  # [{index, student_answer, time_spent_seconds}]


class DiagnosticResultOut(BaseModel):
    id: int
    status: str
    result_json: dict | None = None
    ai_analysis_json: dict | None = None
    questions_json: list | None = None
    answers_json: list | None = None


class GeneratePlanRequest(BaseModel):
    session_id: int


# ── 专项训练 ──
class SectionMasteryOut(BaseModel):
    section: str
    label: str
    mastery: float
    total_points: int
    practiced_points: int


class TrainingSubmitRequest(BaseModel):
    question_id: int
    answer: str


class TrainingSubmitResult(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str
    strategy_tip: str
    knowledge_point: str
    mastery_before: float
    mastery_after: float
    xp: dict | None = None


class KnowledgePointOut(BaseModel):
    id: int
    section: str
    category: str
    name: str
    difficulty: int
    frequency: str
    mastery: float = 0.0


# ── 模拟考试 ──
class MockStartRequest(BaseModel):
    exam_type: str | None = None


class MockSubmitRequest(BaseModel):
    mock_id: int
    answers: list[dict]  # [{question_id, answer, time_spent}]


class MockExamOut(BaseModel):
    id: int
    exam_type: str
    status: str
    time_limit_minutes: int
    sections_json: list | None = None
    answers_json: list | None = None
    score_json: dict | None = None
    ai_report_json: dict | None = None
    started_at: str
    completed_at: str | None = None


# ── 薄弱点突破 ──
class WeaknessItemOut(BaseModel):
    id: int | None = None  # breakthrough id if exists
    knowledge_point_id: int
    section: str
    category: str
    name: str
    mastery: float
    frequency: str
    priority: float
    status: str = "not_started"
    phase: int = 0


class BreakthroughDetailOut(BaseModel):
    id: int
    knowledge_point_id: int
    name: str
    status: str
    phase: int
    micro_lesson_json: dict | None = None
    exercises_json: list | None = None
    total_exercises: int
    completed_exercises: int
    mastery_before: float
    mastery_after: float | None = None


class BreakthroughExerciseSubmit(BaseModel):
    breakthrough_id: int
    exercise_index: int
    answer: str


# ── 分数预测 ──
class ScorePredictionOut(BaseModel):
    predicted_score: float
    confidence: float
    section_predictions_json: dict
    factors_json: dict
    created_at: str


# ── 仪表盘 ──
class ExamDashboardOut(BaseModel):
    profile: ExamProfileOut | None = None
    days_remaining: int | None = None
    section_masteries: list[SectionMasteryOut] = []
    recent_mock_scores: list[dict] = []
    prediction: ScorePredictionOut | None = None
    weak_count: int = 0
    today_tasks: list[dict] = []


# ── 心流刷题 ──
class FlowStartRequest(BaseModel):
    section: str = "reading"


class FlowAnswerRequest(BaseModel):
    session_id: int
    question_id: int
    answer: str
    response_ms: int = 0


class FlowEndRequest(BaseModel):
    session_id: int


# ── 时间沙漏 ──
class TimeRecordRequest(BaseModel):
    session_type: str  # training / mock / flow
    session_id: int
    time_entries: list[dict]  # [{question_id, section, difficulty, budget_seconds, actual_seconds, is_correct}]


# ── 错题基因 ──
class GeneFixSubmitRequest(BaseModel):
    gene_id: int
    exercise_index: int
    answer: str


# ── AI 出题官 ──
class CustomQuizGenerateRequest(BaseModel):
    prompt: str


class CustomQuizSubmitRequest(BaseModel):
    session_id: int
    answers: list[dict]  # [{index, answer}]


# ── 每日冲刺 ──
class SprintTaskCompleteRequest(BaseModel):
    plan_id: int
    task_index: int
