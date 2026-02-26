"""考场复盘剧场服务 — 成长回放动画数据。"""

import json
import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.exam import MockExam, KnowledgeMastery, ExamKnowledgePoint, ExamProfile, ScorePrediction
from app.services.llm import chat_once_json


async def generate_replay_data(user_id: int, db: AsyncSession) -> dict:
    """聚合历史数据，生成成长回放。"""
    profile_result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        return {"error": "请先设置考试档案"}

    # 获取模考历史
    mock_result = await db.execute(
        select(MockExam)
        .where(MockExam.user_id == user_id, MockExam.status == "completed")
        .order_by(MockExam.completed_at.asc())
    )
    mocks = mock_result.scalars().all()

    # 获取当前各题型掌握度
    mastery_result = await db.execute(
        select(
            ExamKnowledgePoint.section,
            func.avg(KnowledgeMastery.mastery_level),
        )
        .join(KnowledgeMastery, KnowledgeMastery.knowledge_point_id == ExamKnowledgePoint.id)
        .where(
            KnowledgeMastery.user_id == user_id,
            ExamKnowledgePoint.exam_type == profile.exam_type,
        )
        .group_by(ExamKnowledgePoint.section)
    )
    current_masteries = {row[0]: round(float(row[1] or 0), 3) for row in mastery_result.all()}

    # 获取分数预测历史
    pred_result = await db.execute(
        select(ScorePrediction)
        .where(ScorePrediction.user_id == user_id)
        .order_by(ScorePrediction.created_at.asc())
    )
    predictions = pred_result.scalars().all()

    # 构建章节（按周分组）
    chapters = []
    mock_scores = []
    for m in mocks:
        score_data = json.loads(m.score_json) if m.score_json else None
        if score_data:
            mock_scores.append({
                "date": m.completed_at.isoformat() if m.completed_at else "",
                "total": score_data.get("total", 0),
                "max": score_data.get("max", 150),
                "sections": score_data.get("sections", {}),
            })

    # 按周分组模考成绩
    if mock_scores:
        week_groups = {}
        for ms in mock_scores:
            date_str = ms["date"][:10]
            try:
                d = datetime.date.fromisoformat(date_str)
                week_key = d.isocalendar()[1]
                year_week = f"{d.year}-W{week_key:02d}"
            except (ValueError, IndexError):
                year_week = "unknown"
            if year_week not in week_groups:
                week_groups[year_week] = []
            week_groups[year_week].append(ms)

        for week_key, scores in sorted(week_groups.items()):
            best = max(scores, key=lambda x: x["total"])
            chapters.append({
                "week": week_key,
                "mock_count": len(scores),
                "best_score": best["total"],
                "max_score": best["max"],
                "scores": scores,
            })

    # 里程碑事件
    milestones = []
    prev_score = 0
    for ms in mock_scores:
        if ms["total"] > prev_score and prev_score > 0:
            milestones.append({
                "date": ms["date"][:10],
                "event": f"模考成绩突破 {ms['total']} 分！",
                "type": "score_up",
            })
        prev_score = ms["total"]

    # 生成 LLM 旁白
    narrative = ""
    if chapters:
        try:
            summary = {
                "total_mocks": len(mocks),
                "chapters": len(chapters),
                "first_score": mock_scores[0]["total"] if mock_scores else 0,
                "latest_score": mock_scores[-1]["total"] if mock_scores else 0,
                "current_masteries": current_masteries,
                "target_score": profile.target_score,
            }
            narr_result = await chat_once_json(
                system_prompt=(
                    "你是一个温暖的学习成长记录者。根据学生的备考数据，写一段成长旁白。\n"
                    "语气温暖、鼓励，像纪录片旁白。2-3 段，每段 1-2 句话。\n"
                    "返回 JSON：{\"narrative\": \"旁白文字\", \"highlight\": \"最大亮点（一句话）\"}"
                ),
                user_prompt=json.dumps(summary, ensure_ascii=False),
            )
            narrative = narr_result.get("narrative", "")
        except Exception:
            narrative = "你的备考之旅正在稳步前进，每一次练习都在积累力量。"

    # 未来投影
    projection = None
    if predictions:
        latest = predictions[-1]
        projection = {
            "predicted_score": latest.predicted_score,
            "confidence": latest.confidence,
            "target_score": profile.target_score,
            "gap": profile.target_score - latest.predicted_score,
        }

    return {
        "exam_type": profile.exam_type,
        "target_score": profile.target_score,
        "exam_date": profile.exam_date,
        "chapters": chapters,
        "current_masteries": current_masteries,
        "milestones": milestones,
        "narrative": narrative,
        "projection": projection,
        "total_mocks": len(mocks),
        "mock_scores": mock_scores,
    }
