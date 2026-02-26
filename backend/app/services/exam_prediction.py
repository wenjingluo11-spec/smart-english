"""分数预测服务 — 多维数据预测 + 周报。"""

import json
import datetime
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.exam import (
    ExamProfile, MockExam, KnowledgeMastery, ExamKnowledgePoint, ScorePrediction,
)
from app.services.llm import chat_once_json

SECTION_LABELS = {
    "listening": "听力理解", "reading": "阅读理解", "cloze": "完形填空",
    "grammar_fill": "语法填空", "error_correction": "短文改错", "writing": "书面表达",
}

# 各 section 满分
ZHONGKAO_SCORES = {"listening": 30, "reading": 40, "cloze": 15, "grammar_fill": 15, "writing": 25}
GAOKAO_SCORES = {"listening": 30, "reading": 40, "cloze": 30, "grammar_fill": 15, "error_correction": 10, "writing": 25}


async def predict_score(user_id: int, db: AsyncSession) -> dict:
    """基于多维数据预测分数。"""
    profile_result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        return {"error": "请先创建考试档案"}

    exam_type = profile.exam_type
    max_scores = GAOKAO_SCORES if exam_type == "gaokao" else ZHONGKAO_SCORES

    # 1. 各 section 知识点平均掌握度
    result = await db.execute(
        select(
            ExamKnowledgePoint.section,
            func.avg(KnowledgeMastery.mastery_level),
            func.count(KnowledgeMastery.id),
        )
        .join(KnowledgeMastery, KnowledgeMastery.knowledge_point_id == ExamKnowledgePoint.id)
        .where(
            KnowledgeMastery.user_id == user_id,
            ExamKnowledgePoint.exam_type == exam_type,
        )
        .group_by(ExamKnowledgePoint.section)
    )
    mastery_data = {row[0]: {"avg": float(row[1] or 0), "count": row[2]} for row in result.all()}

    # 2. 模考历史
    mock_result = await db.execute(
        select(MockExam)
        .where(MockExam.user_id == user_id, MockExam.status == "completed")
        .order_by(desc(MockExam.completed_at))
        .limit(5)
    )
    mocks = mock_result.scalars().all()
    mock_scores = []
    for m in mocks:
        score_data = json.loads(m.score_json) if m.score_json else {}
        mock_scores.append(score_data.get("total", 0))

    # 3. 计算各 section 预测分
    section_predictions = {}
    total_predicted = 0.0
    total_max = sum(max_scores.values())
    data_points = 0

    for sec, max_s in max_scores.items():
        mastery_info = mastery_data.get(sec, {"avg": 0, "count": 0})
        avg_mastery = mastery_info["avg"]
        count = mastery_info["count"]
        data_points += count

        # 掌握度 → 预测得分（非线性映射，低掌握度惩罚更大）
        if avg_mastery > 0:
            score_ratio = avg_mastery ** 0.8  # 略微乐观
            predicted = max_s * score_ratio
        else:
            predicted = max_s * 0.3  # 无数据默认 30%

        # 如果有模考数据，加权融合
        if mock_scores:
            # 从最近模考中提取该 section 分数
            for m in mocks:
                score_data = json.loads(m.score_json) if m.score_json else {}
                sec_scores = score_data.get("sections", {})
                if sec in sec_scores:
                    mock_sec_score = sec_scores[sec].get("score", 0)
                    predicted = predicted * 0.6 + mock_sec_score * 0.4
                    break

        section_predictions[sec] = {
            "label": SECTION_LABELS.get(sec, sec),
            "predicted": round(predicted, 1),
            "max": max_s,
            "mastery": round(avg_mastery, 2),
        }
        total_predicted += predicted

    # 4. 置信度
    total_kp_result = await db.execute(
        select(func.count())
        .select_from(ExamKnowledgePoint)
        .where(ExamKnowledgePoint.exam_type == exam_type)
    )
    total_kps = total_kp_result.scalar() or 1
    coverage = min(1.0, data_points / total_kps)
    mock_factor = min(1.0, len(mock_scores) / 3)
    confidence = round(coverage * 0.6 + mock_factor * 0.4, 2)

    # 5. 分析因素
    strengths = []
    risks = []
    recommendations = []
    for sec, pred in section_predictions.items():
        ratio = pred["predicted"] / pred["max"] if pred["max"] > 0 else 0
        if ratio >= 0.85:
            strengths.append(f"{pred['label']}表现优秀（{pred['predicted']}/{pred['max']}）")
        elif ratio < 0.6:
            risks.append(f"{pred['label']}较薄弱（{pred['predicted']}/{pred['max']}）")
            recommendations.append(f"重点突破{pred['label']}，提升空间约 {pred['max'] - pred['predicted']:.0f} 分")

    # 6. 保存预测
    prediction = ScorePrediction(
        user_id=user_id,
        exam_type=exam_type,
        predicted_score=round(total_predicted, 1),
        confidence=confidence,
        section_predictions_json=json.dumps(section_predictions, ensure_ascii=False),
        factors_json=json.dumps({
            "strengths": strengths, "risks": risks, "recommendations": recommendations,
        }, ensure_ascii=False),
    )
    db.add(prediction)
    await db.flush()

    # 更新档案预估分
    profile.current_estimated_score = int(total_predicted)
    await db.flush()

    return {
        "predicted_score": round(total_predicted, 1),
        "max_score": total_max,
        "confidence": confidence,
        "section_predictions": section_predictions,
        "factors": {"strengths": strengths, "risks": risks, "recommendations": recommendations},
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


async def get_prediction_history(user_id: int, db: AsyncSession) -> list[dict]:
    """获取预测历史。"""
    result = await db.execute(
        select(ScorePrediction)
        .where(ScorePrediction.user_id == user_id)
        .order_by(desc(ScorePrediction.created_at))
        .limit(20)
    )
    predictions = result.scalars().all()
    return [
        {
            "predicted_score": p.predicted_score,
            "confidence": p.confidence,
            "section_predictions_json": json.loads(p.section_predictions_json) if p.section_predictions_json else {},
            "factors_json": json.loads(p.factors_json) if p.factors_json else {},
            "created_at": p.created_at.isoformat() if p.created_at else "",
        }
        for p in predictions
    ]


async def generate_weekly_report(user_id: int, db: AsyncSession) -> dict:
    """LLM 生成周报。"""
    profile_result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        return {"error": "请先创建考试档案"}

    # 收集本周数据
    week_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)

    # 最近掌握度变化
    result = await db.execute(
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
    section_masteries = {row[0]: round(float(row[1] or 0), 2) for row in result.all()}

    # 最近模考
    mock_result = await db.execute(
        select(MockExam)
        .where(MockExam.user_id == user_id, MockExam.status == "completed")
        .order_by(desc(MockExam.completed_at))
        .limit(2)
    )
    recent_mocks = mock_result.scalars().all()
    mock_info = []
    for m in recent_mocks:
        score_data = json.loads(m.score_json) if m.score_json else {}
        mock_info.append({"score": score_data.get("total", 0), "date": m.completed_at.isoformat() if m.completed_at else ""})

    system_prompt = f"""你是一位温暖鼓励的英语老师。根据学生本周的学习数据，生成一份简短的周报。
考试类型：{"中考" if profile.exam_type == "zhongkao" else "高考"}
目标分数：{profile.target_score}
考试日期：{profile.exam_date}

要求：
1. 总结本周进步（具体到哪些方面提升了）
2. 下周重点（最需要突破的 2-3 个方向）
3. 鼓励语（真诚、具体、有力量）

返回 JSON：{{"summary": "本周总结", "focus_next_week": ["重点1", "重点2"], "encouragement": "鼓励语", "score_change": "分数变化描述"}}"""

    user_prompt = f"各题型掌握度：{json.dumps(section_masteries, ensure_ascii=False)}\n最近模考：{json.dumps(mock_info, ensure_ascii=False)}"

    try:
        report = await chat_once_json(system_prompt, user_prompt)
    except Exception:
        report = {
            "summary": "本周你坚持了学习，继续保持！",
            "focus_next_week": ["继续巩固薄弱知识点", "多做模拟练习"],
            "encouragement": "每一天的努力都在为考试积蓄力量，加油！",
            "score_change": "数据积累中",
        }

    return report
