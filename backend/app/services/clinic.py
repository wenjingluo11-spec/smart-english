"""AI错题诊所服务 — 跨模块错误聚合 + LLM分析 + 治疗计划。"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.clinic import ErrorPattern, TreatmentPlan
from app.models.writing import WritingSubmission
from app.models.learning import LearningRecord
from app.services.llm import chat_once_json

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
    for p in analysis.get("patterns", []):
        pattern = ErrorPattern(
            user_id=user_id,
            pattern_type=p.get("pattern_type", "grammar"),
            title=p.get("title", ""),
            description=p.get("description", ""),
            severity=p.get("severity", "moderate"),
            evidence_json=p.get("evidence"),
            diagnosis_json=p.get("diagnosis"),
        )
        db.add(pattern)
        await db.flush()
        patterns_out.append({
            "id": pattern.id, "pattern_type": pattern.pattern_type,
            "title": pattern.title, "description": pattern.description,
            "severity": pattern.severity, "evidence_json": pattern.evidence_json,
            "diagnosis_json": pattern.diagnosis_json, "status": pattern.status,
            "created_at": pattern.created_at.isoformat() if pattern.created_at else "",
        })

    return {
        "patterns": patterns_out,
        "summary": analysis.get("summary", ""),
        "total_errors_analyzed": len(evidence_parts),
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
    plan = TreatmentPlan(
        user_id=user_id,
        pattern_id=pattern_id,
        exercises_json={"exercises": exercises},
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
    }


async def submit_exercise(plan_id: int, exercise_index: int, answer: str, user_id: int, db: AsyncSession) -> dict:
    """提交治疗练习答案。"""
    result = await db.execute(select(TreatmentPlan).where(TreatmentPlan.id == plan_id, TreatmentPlan.user_id == user_id))
    plan = result.scalar_one_or_none()
    if not plan:
        return {"error": "治疗计划不存在"}

    exercises = (plan.exercises_json or {}).get("exercises", [])
    if exercise_index < 0 or exercise_index >= len(exercises):
        return {"error": "练习不存在"}

    ex = exercises[exercise_index]
    correct = ex.get("answer", "")
    is_correct = answer.strip().lower() == correct.strip().lower()

    if is_correct:
        plan.completed_exercises = min(plan.completed_exercises + 1, plan.total_exercises)

    plan_completed = plan.completed_exercises >= plan.total_exercises
    if plan_completed:
        plan.status = "completed"
        # 标记错误模式为已解决
        result2 = await db.execute(select(ErrorPattern).where(ErrorPattern.id == plan.pattern_id))
        pattern = result2.scalar_one_or_none()
        if pattern:
            pattern.status = "resolved"

    await db.flush()

    return {
        "is_correct": is_correct,
        "correct_answer": correct,
        "explanation": ex.get("explanation", ""),
        "progress": plan.completed_exercises,
        "total": plan.total_exercises,
        "plan_completed": plan_completed,
    }
