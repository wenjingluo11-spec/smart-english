"""薄弱点突破服务 — 优先级排序 + 三阶段突破。"""

import json
import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.exam import ExamKnowledgePoint, KnowledgeMastery, WeaknessBreakthrough
from app.services.llm import chat_once_json

FREQ_WEIGHT = {"high": 3, "medium": 2, "low": 1}


async def get_weakness_list(user_id: int, exam_type: str, db: AsyncSession) -> list[dict]:
    """按优先级排序薄弱知识点。"""
    result = await db.execute(
        select(ExamKnowledgePoint, KnowledgeMastery.mastery_level, WeaknessBreakthrough.id, WeaknessBreakthrough.status, WeaknessBreakthrough.phase)
        .outerjoin(
            KnowledgeMastery,
            (KnowledgeMastery.knowledge_point_id == ExamKnowledgePoint.id)
            & (KnowledgeMastery.user_id == user_id),
        )
        .outerjoin(
            WeaknessBreakthrough,
            (WeaknessBreakthrough.knowledge_point_id == ExamKnowledgePoint.id)
            & (WeaknessBreakthrough.user_id == user_id),
        )
        .where(ExamKnowledgePoint.exam_type == exam_type)
    )
    rows = result.all()

    items = []
    for kp, mastery, bt_id, bt_status, bt_phase in rows:
        m = mastery or 0.0
        if m >= 0.85:
            continue  # 已掌握，不算薄弱
        freq_w = FREQ_WEIGHT.get(kp.frequency, 1)
        diff_w = kp.difficulty / 5.0
        priority = (1 - m) * freq_w * (1 + diff_w)
        items.append({
            "id": bt_id,
            "knowledge_point_id": kp.id,
            "section": kp.section,
            "category": kp.category,
            "name": kp.name,
            "mastery": round(m, 2),
            "frequency": kp.frequency,
            "priority": round(priority, 2),
            "status": bt_status or "not_started",
            "phase": bt_phase or 0,
        })

    items.sort(key=lambda x: x["priority"], reverse=True)
    return items


async def start_breakthrough(user_id: int, kp_id: int, db: AsyncSession) -> dict:
    """开始突破某知识点 — LLM 生成三阶段方案。"""
    # 查知识点
    kp_result = await db.execute(
        select(ExamKnowledgePoint).where(ExamKnowledgePoint.id == kp_id)
    )
    kp = kp_result.scalar_one_or_none()
    if not kp:
        return {"error": "知识点不存在"}

    # 查当前掌握度
    m_result = await db.execute(
        select(KnowledgeMastery)
        .where(KnowledgeMastery.user_id == user_id, KnowledgeMastery.knowledge_point_id == kp_id)
    )
    mastery_record = m_result.scalar_one_or_none()
    mastery_before = mastery_record.mastery_level if mastery_record else 0.0

    # 检查是否已有进行中的突破
    existing = await db.execute(
        select(WeaknessBreakthrough)
        .where(
            WeaknessBreakthrough.user_id == user_id,
            WeaknessBreakthrough.knowledge_point_id == kp_id,
            WeaknessBreakthrough.status.in_(["pending", "in_progress"]),
        )
    )
    bt = existing.scalar_one_or_none()
    if bt:
        return _breakthrough_to_dict(bt, kp.name)

    # LLM 生成突破方案
    system_prompt = f"""你是一位资深英语教师。学生在「{kp.category} - {kp.name}」这个知识点上比较薄弱（掌握度 {mastery_before:.0%}）。
请生成一个三阶段突破方案。

Phase 1 - 微课：
- 用简洁易懂的语言讲解这个知识点
- 给出 3-5 个典型例句
- 列出常见易错点

Phase 2 - 专项练习：
- 5 道递进难度的选择题
- 每题 4 个选项

Phase 3 - 实战检验：
- 3 道真题级别的综合题

返回 JSON 格式：
{{
  "micro_lesson": {{
    "title": "标题",
    "explanation": "知识点讲解",
    "examples": ["例句1", "例句2", ...],
    "common_mistakes": ["易错点1", ...]
  }},
  "exercises": [
    {{"question": "题目", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "explanation": "解析", "phase": 2, "difficulty": 1-5}}
  ]
}}
exercises 数组应包含 8 道题（Phase 2 的 5 道 + Phase 3 的 3 道）。"""

    user_prompt = f"知识点：{kp.category} - {kp.name}\n描述：{kp.description}\n当前掌握度：{mastery_before:.0%}"

    try:
        plan = await chat_once_json(system_prompt, user_prompt)
    except Exception:
        plan = _fallback_plan(kp)

    micro_lesson = plan.get("micro_lesson", {})
    exercises = plan.get("exercises", [])

    bt = WeaknessBreakthrough(
        user_id=user_id,
        knowledge_point_id=kp_id,
        status="in_progress",
        phase=1,
        micro_lesson_json=json.dumps(micro_lesson, ensure_ascii=False),
        exercises_json=json.dumps(exercises, ensure_ascii=False),
        total_exercises=len(exercises),
        completed_exercises=0,
        mastery_before=mastery_before,
    )
    db.add(bt)
    await db.flush()

    return _breakthrough_to_dict(bt, kp.name)


def _fallback_plan(kp) -> dict:
    """LLM 失败时的 fallback。"""
    return {
        "micro_lesson": {
            "title": kp.name,
            "explanation": f"关于{kp.name}的知识点讲解，请参考教材相关章节。",
            "examples": [],
            "common_mistakes": [],
        },
        "exercises": [],
    }


async def submit_breakthrough_exercise(
    breakthrough_id: int, exercise_index: int, answer: str, user_id: int, db: AsyncSession
) -> dict:
    """提交突破练习答案。"""
    result = await db.execute(
        select(WeaknessBreakthrough)
        .where(WeaknessBreakthrough.id == breakthrough_id, WeaknessBreakthrough.user_id == user_id)
    )
    bt = result.scalar_one_or_none()
    if not bt:
        return {"error": "突破记录不存在"}

    exercises = json.loads(bt.exercises_json) if bt.exercises_json else []
    if exercise_index >= len(exercises):
        return {"error": "练习索引无效"}

    ex = exercises[exercise_index]
    correct_answer = str(ex.get("answer", "")).strip()
    is_correct = answer.strip().upper()[:1] == correct_answer.upper()[:1]

    # 标记完成
    ex["completed"] = True
    ex["correct"] = is_correct
    bt.exercises_json = json.dumps(exercises, ensure_ascii=False)
    bt.completed_exercises = sum(1 for e in exercises if e.get("completed"))

    # 更新掌握度
    from app.services.exam_training import update_mastery
    mastery_after = await update_mastery(user_id, bt.knowledge_point_id, is_correct, db)

    # 推进阶段
    phase2_exercises = [e for e in exercises if e.get("phase", 2) == 2]
    phase3_exercises = [e for e in exercises if e.get("phase", 3) == 3]
    phase2_done = all(e.get("completed") for e in phase2_exercises) if phase2_exercises else True
    phase3_done = all(e.get("completed") for e in phase3_exercises) if phase3_exercises else True

    if bt.phase == 1:
        bt.phase = 2
        bt.status = "in_progress"
    elif bt.phase == 2 and phase2_done:
        bt.phase = 3
    elif bt.phase == 3 and phase3_done:
        bt.status = "completed"
        bt.mastery_after = mastery_after

    await db.flush()

    return {
        "is_correct": is_correct,
        "correct_answer": correct_answer,
        "explanation": ex.get("explanation", ""),
        "phase": bt.phase,
        "status": bt.status,
        "completed_exercises": bt.completed_exercises,
        "total_exercises": bt.total_exercises,
        "mastery_after": mastery_after,
    }


def _breakthrough_to_dict(bt, kp_name: str) -> dict:
    return {
        "id": bt.id,
        "knowledge_point_id": bt.knowledge_point_id,
        "name": kp_name,
        "status": bt.status,
        "phase": bt.phase,
        "micro_lesson_json": json.loads(bt.micro_lesson_json) if bt.micro_lesson_json else None,
        "exercises_json": json.loads(bt.exercises_json) if bt.exercises_json else [],
        "total_exercises": bt.total_exercises,
        "completed_exercises": bt.completed_exercises,
        "mastery_before": bt.mastery_before,
        "mastery_after": bt.mastery_after,
    }
