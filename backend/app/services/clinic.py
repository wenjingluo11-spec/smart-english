"""AI错题诊所服务 — 跨模块错误聚合 + LLM分析 + 治疗计划。"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.clinic import ErrorPattern, TreatmentPlan
from app.models.writing import WritingSubmission
from app.models.learning import LearningRecord
from app.services.llm import chat_once_json
from app.services.cognitive_orchestrator import score_reflection_quality, to_mirror_level

DIAGNOSIS_SYSTEM = """你是一位英语学习诊断专家。根据学生的错误记录，分析错误模式。
返回 JSON：
{
  "patterns": [
    {
      "pattern_type": "grammar|vocabulary|l1_transfer|spelling",
      "title": "错误模式标题（如：be动词与实义动词混用）",
      "description": "详细描述",
      "severity": "mild|moderate|severe",
      "evidence": [{"source": "来源", "text": "错误文本"}],
      "diagnosis": {"root_cause": "根本原因", "l1_interference": "母语干扰说明", "knowledge_gaps": ["知识缺口"]}
    }
  ],
  "summary": "总体诊断摘要"
}"""

TREATMENT_SYSTEM = """你是一位英语学习治疗师。根据错误模式，生成针对性练习。
返回 JSON：
{
  "exercises": [
    {"type": "choice", "question": "题目", "options": ["A","B","C","D"], "answer": "A", "explanation": "解析"},
    {"type": "fill", "question": "填空题 ___", "answer": "答案", "explanation": "解析"},
    {"type": "rewrite", "question": "改写句子", "original": "错误句", "answer": "正确句", "explanation": "解析"}
  ]
}
请生成 5 道针对性练习题，难度递进。"""


def _severity_to_tqi(severity: str) -> float:
    mapping = {
        "severe": 0.30,
        "moderate": 0.50,
        "mild": 0.70,
    }
    return mapping.get((severity or "moderate").lower(), 0.50)


def _required_reflection_score(severity: str) -> float:
    mapping = {
        "severe": 0.55,
        "moderate": 0.45,
        "mild": 0.35,
    }
    return mapping.get((severity or "moderate").lower(), 0.45)


async def run_diagnosis(user_id: int, db: AsyncSession) -> dict:
    """跨模块聚合错误数据，调用 LLM 分析错误模式。"""
    # 收集写作反馈中的错误
    result = await db.execute(
        select(WritingSubmission)
        .where(WritingSubmission.user_id == user_id, WritingSubmission.feedback_json.isnot(None))
        .order_by(WritingSubmission.created_at.desc())
        .limit(10)
    )
    writings = result.scalars().all()

    # 收集练习错误
    result = await db.execute(
        select(LearningRecord)
        .where(LearningRecord.user_id == user_id, LearningRecord.is_correct == False)
        .order_by(LearningRecord.created_at.desc())
        .limit(20)
    )
    wrong_records = result.scalars().all()

    # 构建错误证据
    evidence_parts = []
    for w in writings:
        fb = w.feedback_json or {}
        corrections = fb.get("corrected_sentences", [])
        for c in corrections:
            evidence_parts.append(f"写作错误: {c.get('original', '')} → {c.get('corrected', '')} ({c.get('reason', '')})")
        for imp in fb.get("improvements", []):
            evidence_parts.append(f"写作改进建议: {imp}")

    for r in wrong_records:
        evidence_parts.append(f"练习错误: question_id={r.question_id}")

    if not evidence_parts:
        return {"patterns": [], "summary": "暂无足够的错误数据进行诊断", "total_errors_analyzed": 0}

    user_prompt = f"以下是学生的错误记录（共 {len(evidence_parts)} 条）：\n" + "\n".join(evidence_parts[:30])

    try:
        analysis = await chat_once_json(DIAGNOSIS_SYSTEM, user_prompt)
    except Exception:
        return {"patterns": [], "summary": "诊断服务暂时不可用", "total_errors_analyzed": len(evidence_parts)}

    # 保存错误模式
    patterns_out = []
    tqi_scores: list[float] = []
    for p in analysis.get("patterns", []):
        severity = p.get("severity", "moderate")
        estimated_tqi = _severity_to_tqi(severity)
        mirror_level = to_mirror_level(estimated_tqi)
        diagnosis = p.get("diagnosis", {}) or {}
        if isinstance(diagnosis, dict):
            diagnosis["mirror_level"] = mirror_level
            diagnosis["estimated_tqi"] = estimated_tqi

        pattern = ErrorPattern(
            user_id=user_id,
            pattern_type=p.get("pattern_type", "grammar"),
            title=p.get("title", ""),
            description=p.get("description", ""),
            severity=severity,
            evidence_json=p.get("evidence"),
            diagnosis_json=diagnosis,
        )
        db.add(pattern)
        await db.flush()
        tqi_scores.append(estimated_tqi)
        patterns_out.append({
            "id": pattern.id, "pattern_type": pattern.pattern_type,
            "title": pattern.title, "description": pattern.description,
            "severity": pattern.severity, "evidence_json": pattern.evidence_json,
            "diagnosis_json": pattern.diagnosis_json, "status": pattern.status,
            "mirror_level": mirror_level,
            "estimated_tqi": estimated_tqi,
            "created_at": pattern.created_at.isoformat() if pattern.created_at else "",
        })

    return {
        "patterns": patterns_out,
        "summary": analysis.get("summary", ""),
        "total_errors_analyzed": len(evidence_parts),
        "estimated_tqi": round(sum(tqi_scores) / len(tqi_scores), 3) if tqi_scores else None,
        "mirror_level": to_mirror_level(sum(tqi_scores) / len(tqi_scores)) if tqi_scores else None,
    }


async def generate_treatment(pattern_id: int, user_id: int, db: AsyncSession) -> dict:
    """为错误模式生成治疗计划。"""
    result = await db.execute(select(ErrorPattern).where(ErrorPattern.id == pattern_id, ErrorPattern.user_id == user_id))
    pattern = result.scalar_one_or_none()
    if not pattern:
        return {"error": "错误模式不存在"}

    user_prompt = f"错误模式：{pattern.title}\n描述：{pattern.description}\n严重程度：{pattern.severity}\n诊断：{pattern.diagnosis_json}"

    try:
        plan_data = await chat_once_json(TREATMENT_SYSTEM, user_prompt)
    except Exception:
        plan_data = {"exercises": []}

    exercises = plan_data.get("exercises", [])
    required_reflection = _required_reflection_score(pattern.severity)
    pattern_diag = pattern.diagnosis_json or {}
    mirror_level = pattern_diag.get("mirror_level") if isinstance(pattern_diag, dict) else None
    if not mirror_level:
        mirror_level = to_mirror_level(_severity_to_tqi(pattern.severity))

    plan = TreatmentPlan(
        user_id=user_id,
        pattern_id=pattern_id,
        exercises_json={
            "exercises": exercises,
            "required_reflection_score": required_reflection,
            "mirror_level": mirror_level,
        },
        total_exercises=len(exercises),
        status="in_progress",
    )
    db.add(plan)
    pattern.status = "treating"
    await db.flush()

    return {
        "id": plan.id, "pattern_id": pattern_id,
        "exercises_json": plan.exercises_json,
        "total_exercises": plan.total_exercises,
        "completed_exercises": 0, "status": plan.status,
        "required_reflection_score": required_reflection,
        "mirror_level": mirror_level,
    }


async def submit_exercise(
    plan_id: int,
    exercise_index: int,
    answer: str,
    user_id: int,
    db: AsyncSession,
    reflection_text: str | None = None,
) -> dict:
    """提交治疗练习答案。"""
    result = await db.execute(select(TreatmentPlan).where(TreatmentPlan.id == plan_id, TreatmentPlan.user_id == user_id))
    plan = result.scalar_one_or_none()
    if not plan:
        return {"error": "治疗计划不存在"}

    payload = plan.exercises_json or {}
    exercises = payload.get("exercises", [])
    required_reflection = float(payload.get("required_reflection_score", 0.45))
    if exercise_index < 0 or exercise_index >= len(exercises):
        return {"error": "练习不存在"}

    ex = exercises[exercise_index]
    correct = ex.get("answer", "")
    is_correct = answer.strip().lower() == correct.strip().lower()
    reflection_score = score_reflection_quality((reflection_text or "").strip())

    already_completed = bool(ex.get("completed"))
    if is_correct and not already_completed:
        plan.completed_exercises = min(plan.completed_exercises + 1, plan.total_exercises)
        ex["completed"] = True
    ex["reflection_text"] = (reflection_text or "").strip()
    ex["reflection_score"] = reflection_score
    payload["exercises"] = exercises
    plan.exercises_json = payload

    completed_reflections = [float(e.get("reflection_score", 0.0)) for e in exercises if e.get("completed")]
    avg_reflection = sum(completed_reflections) / len(completed_reflections) if completed_reflections else 0.0
    reflection_ready = avg_reflection >= required_reflection
    plan_completed = plan.completed_exercises >= plan.total_exercises and reflection_ready

    if plan_completed:
        plan.status = "completed"
        # 标记错误模式为已解决
        result2 = await db.execute(select(ErrorPattern).where(ErrorPattern.id == plan.pattern_id))
        pattern = result2.scalar_one_or_none()
        if pattern:
            pattern.status = "resolved"
    else:
        plan.status = "in_progress"

    await db.flush()

    return {
        "is_correct": is_correct,
        "correct_answer": correct,
        "explanation": ex.get("explanation", ""),
        "progress": plan.completed_exercises,
        "total": plan.total_exercises,
        "plan_completed": plan_completed,
        "reflection_quality_score": round(reflection_score, 3),
        "avg_reflection_score": round(avg_reflection, 3),
        "required_reflection_score": round(required_reflection, 3),
        "reflection_required": not reflection_ready,
    }
