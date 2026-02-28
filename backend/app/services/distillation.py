"""认知增强蒸馏服务 — 将人工标注 + 用户行为 + AI 分析结果蒸馏为认知增强知识库。

V4.4 功能：
- 聚合每种题型的最佳审题策略
- 统计常见错误模式
- 评估哪些线索类型最有效
- 持续优化审题演示质量
"""

import json
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.behavior import CognitiveKnowledgeBase, BehaviorEvent, CognitiveFeedbackRecord
from app.models.question import Question
from app.models.question_analysis import QuestionAnalysis, HumanAnnotation
from app.models.learning import LearningRecord
from collections import Counter
from app.services.llm import chat_once_json


_DISTILL_PROMPT = """你是一个认知增强策略分析专家。根据以下数据，总结该题型的最佳审题策略。

数据包括：
- 人工标注的审题轨迹样本
- AI 分析的题眼和策略
- 用户行为统计（哪些功能使用后正确率更高）
- 用户反馈数据（学生对认知增强内容的评价）
- 常见错误模式

请总结出：
1. best_strategy: 最佳审题策略（名称+描述+步骤）
2. common_errors: 常见错误模式列表（错误模式+频率描述+修正建议）
3. effective_clues: 最有效的线索类型列表（线索类型+有效性说明+示例）
4. enhancement_tips: 认知增强使用建议（什么时候用什么功能最有效）

返回 JSON：
{
    "best_strategy": {
        "name": "策略名称",
        "description": "策略描述",
        "steps": ["步骤1", "步骤2"],
        "success_rate_hint": "使用此策略的预期效果"
    },
    "common_errors": [
        {"pattern": "错误模式", "frequency": "high|medium|low", "fix": "修正建议"}
    ],
    "effective_clues": [
        {"type": "线索类型", "effectiveness": "high|medium|low", "example": "示例"}
    ],
    "enhancement_tips": [
        {"feature": "功能名称", "when": "什么时候用", "effect": "预期效果"}
    ]
}"""


async def distill_knowledge(
    db: AsyncSession,
    question_type: str,
    topic: str = "",
    difficulty: int = 3,
    subject: str = "english",
) -> dict:
    """对指定题型进行知识蒸馏，更新认知增强知识库。"""

    # 1. 收集人工标注数据
    ha_result = await db.execute(
        select(HumanAnnotation)
        .where(HumanAnnotation.quality_score >= 3)
        .order_by(HumanAnnotation.quality_score.desc())
        .limit(10)
    )
    annotations = ha_result.scalars().all()
    annotation_summaries = []
    for a in annotations:
        if a.gaze_path_json:
            try:
                gaze = json.loads(a.gaze_path_json)
                annotation_summaries.append({
                    "narration": a.narration or "",
                    "steps": len(gaze) if isinstance(gaze, list) else 0,
                })
            except Exception:
                pass

    # 2. 收集 AI 分析数据
    qa_result = await db.execute(
        select(QuestionAnalysis)
        .where(QuestionAnalysis.question_type == question_type)
        .limit(20)
    )
    analyses = qa_result.scalars().all()
    strategy_samples = []
    for qa in analyses:
        if qa.strategy:
            strategy_samples.append(qa.strategy)

    # 3. 收集行为统计
    behavior_stats = await _get_behavior_stats_for_type(db, question_type)

    # 3.5 收集用户反馈数据
    feedback_stats = await _get_feedback_stats(db, question_type)

    # 4. 调用 LLM 蒸馏
    user_prompt = (
        f"【题型】{question_type}\n"
        f"【知识点】{topic}\n"
        f"【难度】{difficulty}\n\n"
        f"【人工标注样本数】{len(annotation_summaries)}\n"
        f"【人工标注摘要】{json.dumps(annotation_summaries[:5], ensure_ascii=False)}\n\n"
        f"【AI策略样本】{json.dumps(strategy_samples[:10], ensure_ascii=False)}\n\n"
        f"【用户行为统计】{json.dumps(behavior_stats, ensure_ascii=False)}\n\n"
        f"【用户反馈统计】{json.dumps(feedback_stats, ensure_ascii=False)}"
    )

    try:
        distilled = await chat_once_json(_DISTILL_PROMPT, user_prompt)
    except Exception:
        distilled = {
            "best_strategy": {},
            "common_errors": [],
            "effective_clues": [],
            "enhancement_tips": [],
        }

    # 5. 写入知识库
    result = await db.execute(
        select(CognitiveKnowledgeBase).where(
            CognitiveKnowledgeBase.question_type == question_type,
            CognitiveKnowledgeBase.topic == topic,
            CognitiveKnowledgeBase.difficulty == difficulty,
            CognitiveKnowledgeBase.subject == subject,
        )
    )
    kb = result.scalar_one_or_none()

    if not kb:
        kb = CognitiveKnowledgeBase(
            question_type=question_type,
            topic=topic,
            difficulty=difficulty,
            subject=subject,
        )
        db.add(kb)

    kb.best_strategy_json = json.dumps(distilled.get("best_strategy", {}), ensure_ascii=False)
    kb.common_errors_json = json.dumps(distilled.get("common_errors", []), ensure_ascii=False)
    kb.effective_clues_json = json.dumps(distilled.get("effective_clues", []), ensure_ascii=False)
    kb.human_annotation_count = len(annotations)
    kb.ai_analysis_count = len(analyses)
    kb.user_behavior_count = behavior_stats.get("total_events", 0) + feedback_stats.get("total_feedback_count", 0)

    await db.commit()

    return {
        "question_type": question_type,
        "topic": topic,
        "difficulty": difficulty,
        "distilled": distilled,
        "sources": {
            "human_annotations": len(annotations),
            "ai_analyses": len(analyses),
            "behavior_events": behavior_stats.get("total_events", 0),
        },
    }


async def get_knowledge_base(
    db: AsyncSession,
    question_type: str = "",
    subject: str = "english",
) -> list[dict]:
    """查询认知增强知识库。"""
    stmt = select(CognitiveKnowledgeBase)
    if question_type:
        stmt = stmt.where(CognitiveKnowledgeBase.question_type == question_type)
    stmt = stmt.where(CognitiveKnowledgeBase.subject == subject)
    stmt = stmt.order_by(CognitiveKnowledgeBase.updated_at.desc())

    result = await db.execute(stmt)
    entries = result.scalars().all()

    return [
        {
            "id": e.id,
            "question_type": e.question_type,
            "topic": e.topic,
            "difficulty": e.difficulty,
            "best_strategy": json.loads(e.best_strategy_json) if e.best_strategy_json else {},
            "common_errors": json.loads(e.common_errors_json) if e.common_errors_json else [],
            "effective_clues": json.loads(e.effective_clues_json) if e.effective_clues_json else [],
            "human_annotation_count": e.human_annotation_count,
            "ai_analysis_count": e.ai_analysis_count,
            "user_behavior_count": e.user_behavior_count,
            "avg_success_rate": e.avg_success_rate,
            "updated_at": e.updated_at.isoformat() if e.updated_at else "",
        }
        for e in entries
    ]


async def _get_behavior_stats_for_type(
    db: AsyncSession, question_type: str
) -> dict:
    """获取特定题型的行为统计。"""
    result = await db.execute(
        select(
            func.count().label("total"),
            func.count(func.nullif(BehaviorEvent.event_type == "tts_play", False)).label("tts_count"),
            func.count(func.nullif(BehaviorEvent.event_type == "demo_play", False)).label("demo_count"),
            func.count(func.nullif(BehaviorEvent.event_type == "highlight_click", False)).label("highlight_count"),
            func.count(func.nullif(BehaviorEvent.event_type == "hint_request", False)).label("hint_count"),
        )
        .where(BehaviorEvent.module == question_type)
    )
    row = result.one()
    total = row.total or 1
    return {
        "total_events": row.total or 0,
        "tts_usage_rate": round((row.tts_count or 0) / total, 3),
        "demo_usage_rate": round((row.demo_count or 0) / total, 3),
        "highlight_usage_rate": round((row.highlight_count or 0) / total, 3),
        "hint_usage_rate": round((row.hint_count or 0) / total, 3),
    }


async def _get_feedback_stats(db: AsyncSession, question_type: str) -> dict:
    """获取特定题型的用户反馈统计。"""
    base = (
        select(CognitiveFeedbackRecord)
        .join(Question, Question.id == CognitiveFeedbackRecord.question_id)
        .where(Question.question_type == question_type)
    )
    result = await db.execute(base)
    records = result.scalars().all()

    if not records:
        return {"total_feedback_count": 0, "avg_rating": 0, "helpful_count": 0,
                "neutral_count": 0, "unhelpful_count": 0, "top_helpful_steps": []}

    helpful = sum(1 for r in records if r.rating == 1)
    neutral = sum(1 for r in records if r.rating == 2)
    unhelpful = sum(1 for r in records if r.rating == 3)
    avg_rating = round(sum(r.rating for r in records) / len(records), 2)

    step_counter: Counter = Counter()
    for r in records:
        if r.helpful_steps:
            try:
                steps = json.loads(r.helpful_steps)
                if isinstance(steps, list):
                    step_counter.update(steps)
            except Exception:
                pass

    return {
        "total_feedback_count": len(records),
        "avg_rating": avg_rating,
        "helpful_count": helpful,
        "neutral_count": neutral,
        "unhelpful_count": unhelpful,
        "top_helpful_steps": step_counter.most_common(5),
    }


async def auto_distill(db: AsyncSession) -> list[dict]:
    """自动对所有题型执行知识蒸馏，供定时任务调用。"""
    result = await db.execute(
        select(QuestionAnalysis.question_type).distinct()
    )
    question_types = [row[0] for row in result.all() if row[0]]

    results = []
    for qt in question_types:
        r = await distill_knowledge(db, qt)
        results.append(r)
    return results
