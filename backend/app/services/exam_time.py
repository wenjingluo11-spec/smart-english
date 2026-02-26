"""时间沙漏服务 — 考场时间管理训练。"""

import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.exam import ExamTimeRecord
from app.services.exam_mock import GAOKAO_STRUCTURE, ZHONGKAO_STRUCTURE
from app.services.llm import chat_once_json


# 每道题的基准时间（秒），按题型和难度
BASE_TIME_PER_QUESTION = {
    "reading": 120,
    "seven_choose_five": 120,
    "cloze": 90,
    "grammar_fill": 90,
    "single_choice": 45,
    "error_correction": 60,
    "writing": 1800,
    "application_writing": 900,
    "continuation_writing": 1500,
    "listening": 60,
}

DIFFICULTY_MULTIPLIER = {1: 0.7, 2: 0.85, 3: 1.0, 4: 1.2, 5: 1.5}


def calculate_time_budgets(exam_type: str, questions: list[dict]) -> list[dict]:
    """为每道题计算时间预算。"""
    budgets = []
    for q in questions:
        section = q.get("section", "reading")
        difficulty = q.get("difficulty", 3)
        base = BASE_TIME_PER_QUESTION.get(section, 90)
        multiplier = DIFFICULTY_MULTIPLIER.get(difficulty, 1.0)
        budget_seconds = int(base * multiplier)
        budgets.append({
            "question_id": q.get("id"),
            "section": section,
            "difficulty": difficulty,
            "budget_seconds": budget_seconds,
        })
    return budgets


async def record_time_data(
    user_id: int, session_type: str, session_id: int, time_entries: list[dict], db: AsyncSession
) -> dict:
    """保存时间数据并计算按时率。"""
    on_budget = 0
    total = len(time_entries)
    for entry in time_entries:
        if entry.get("actual_seconds", 999) <= entry.get("budget_seconds", 0) * 1.1:
            on_budget += 1

    on_budget_rate = round(on_budget / max(total, 1), 3)

    record = ExamTimeRecord(
        user_id=user_id,
        session_type=session_type,
        session_id=session_id,
        time_data_json=json.dumps(time_entries, ensure_ascii=False),
        on_budget_rate=on_budget_rate,
    )
    db.add(record)
    await db.flush()

    return {
        "id": record.id,
        "on_budget_rate": on_budget_rate,
        "on_budget_count": on_budget,
        "total": total,
    }


async def get_time_history(user_id: int, db: AsyncSession) -> list[dict]:
    """获取时间管理历史趋势。"""
    result = await db.execute(
        select(ExamTimeRecord)
        .where(ExamTimeRecord.user_id == user_id)
        .order_by(ExamTimeRecord.created_at.desc())
        .limit(30)
    )
    records = result.scalars().all()
    return [
        {
            "id": r.id,
            "session_type": r.session_type,
            "on_budget_rate": r.on_budget_rate,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "time_data": json.loads(r.time_data_json) if r.time_data_json else [],
        }
        for r in records
    ]


async def analyze_time_patterns(user_id: int, db: AsyncSession) -> dict:
    """LLM 分析时间使用模式。"""
    result = await db.execute(
        select(ExamTimeRecord)
        .where(ExamTimeRecord.user_id == user_id)
        .order_by(ExamTimeRecord.created_at.desc())
        .limit(10)
    )
    records = result.scalars().all()
    if not records:
        return {"analysis": "暂无足够的时间数据，请先完成几次训练或模考。", "tips": []}

    # 汇总数据
    all_entries = []
    for r in records:
        entries = json.loads(r.time_data_json) if r.time_data_json else []
        all_entries.extend(entries)

    if not all_entries:
        return {"analysis": "暂无详细时间数据。", "tips": []}

    # 按题型统计超时情况
    section_stats = {}
    for e in all_entries:
        sec = e.get("section", "unknown")
        if sec not in section_stats:
            section_stats[sec] = {"total": 0, "over_budget": 0, "total_over_seconds": 0}
        section_stats[sec]["total"] += 1
        actual = e.get("actual_seconds", 0)
        budget = e.get("budget_seconds", 0)
        if actual > budget * 1.1:
            section_stats[sec]["over_budget"] += 1
            section_stats[sec]["total_over_seconds"] += actual - budget

    summary = json.dumps(section_stats, ensure_ascii=False)

    try:
        analysis = await chat_once_json(
            system_prompt=(
                "你是一个英语考试时间管理教练。根据学生的做题时间数据，分析时间使用模式并给出建议。\n"
                "返回 JSON：{\"analysis\": \"整体分析（2-3句话）\", \"tips\": [\"建议1\", \"建议2\", \"建议3\"], "
                "\"worst_section\": \"最需要改善的题型\", \"improvement_rate\": 0.0到1.0}"
            ),
            user_prompt=f"学生最近的做题时间统计（按题型）：\n{summary}\n\n请分析时间使用模式。",
        )
        # 保存分析到最新记录
        if records:
            records[0].ai_analysis_json = json.dumps(analysis, ensure_ascii=False)
            await db.flush()
        return analysis
    except Exception:
        return {"analysis": "时间分析服务暂时不可用。", "tips": [], "worst_section": "", "improvement_rate": 0.0}
