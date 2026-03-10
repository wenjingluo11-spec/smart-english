"""认知编排内核：阶段判定、偏离重构、基础 TQI 估计与会话落库。"""

from __future__ import annotations

import re
from dataclasses import dataclass
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.cognitive import (
    CognitiveSession,
    CognitiveTurn,
    ReflectionEntry,
    TeachingQualityMetric,
)

DIRECT_ANSWER_PATTERNS = [
    r"直接告诉我",
    r"给我答案",
    r"直接给答案",
    r"只要答案",
    r"不要解释",
    r"不用解释",
    r"tell me the answer",
    r"just give me the answer",
    r"answer only",
    r"no explanation",
]


@dataclass
class GuidanceDecision:
    should_divert: bool
    stage: str
    mirror_level: str | None
    zpd_band: str
    tqi_score: float
    prompt_suffix: str
    diversion_message: str | None


def detect_direct_answer_request(text: str) -> bool:
    lowered = text.lower().strip()
    return any(re.search(p, lowered) for p in DIRECT_ANSWER_PATTERNS)


def score_reflection_quality(reflection_text: str) -> float:
    text = (reflection_text or "").strip()
    if not text:
        return 0.0

    # 简单启发式：长度 + 逻辑连接词 + 自我修正表达
    length_score = min(len(text) / 120.0, 1.0)
    logic_hits = len(re.findall(r"(因为|所以|但是|因此|if|because|therefore|however)", text, flags=re.IGNORECASE))
    logic_score = min(logic_hits / 3.0, 1.0)
    self_check_hits = len(re.findall(r"(我认为|我不确定|可能|I think|I guess|not sure|maybe)", text, flags=re.IGNORECASE))
    self_check_score = min(self_check_hits / 2.0, 1.0)
    return round(length_score * 0.5 + logic_score * 0.3 + self_check_score * 0.2, 3)


def to_mirror_level(tqi_score: float) -> str:
    if tqi_score <= 0.25:
        return "M0"
    if tqi_score <= 0.50:
        return "M1"
    if tqi_score <= 0.75:
        return "M2"
    return "M3"


def estimate_zpd_band(tqi_score: float, hint_budget: int) -> str:
    if tqi_score < 0.30 and hint_budget <= 1:
        return "hard"
    if tqi_score > 0.80 and hint_budget >= 3:
        return "easy"
    return "sweet"


def decide_stage(reflection_text: str, should_divert: bool) -> str:
    if should_divert:
        return "present"
    if not reflection_text.strip():
        return "query"
    return "reflect"


def build_prompt_suffix(guidance_level: str, stage: str, zpd_band: str, mirror_level: str | None) -> str:
    base = [
        "你必须优先引导学生思考，不要直接输出最终答案。",
        "输出应包含一个追问问题，促使学生解释其推理过程。",
        f"当前阶段: {stage}。",
        f"当前 ZPD 区间: {zpd_band}。",
    ]
    if guidance_level in ("mirror", "hybrid") and mirror_level:
        base.append(f"当前镜像层级: {mirror_level}，请按该层级控制反馈力度。")
    if zpd_band == "hard":
        base.append("请降低任务颗粒度，优先给局部线索与检查点。")
    elif zpd_band == "easy":
        base.append("请提高追问深度，要求学生给出反证或迁移应用。")
    return "\n".join(base)


def build_diversion_message(user_message: str) -> str:
    return (
        "先不直接给答案。请你先写两点：\n"
        "1) 你目前的思路是什么；\n"
        "2) 你最不确定的地方是哪一步。\n"
        "你写完后我会基于你的思路给分层提示。"
    )


def decide_guidance(
    user_message: str,
    reflection_text: str,
    guidance_level: str = "socratic",
    hint_budget: int = 2,
    allow_direct_answer: bool = False,
) -> GuidanceDecision:
    should_divert = detect_direct_answer_request(user_message) and not allow_direct_answer
    tqi = score_reflection_quality(reflection_text)
    mirror = to_mirror_level(tqi) if guidance_level in ("mirror", "hybrid") else None
    zpd = estimate_zpd_band(tqi, hint_budget)
    stage = decide_stage(reflection_text, should_divert)
    suffix = build_prompt_suffix(guidance_level, stage, zpd, mirror)
    diversion_message = build_diversion_message(user_message) if should_divert else None
    return GuidanceDecision(
        should_divert=should_divert,
        stage=stage,
        mirror_level=mirror,
        zpd_band=zpd,
        tqi_score=tqi,
        prompt_suffix=suffix,
        diversion_message=diversion_message,
    )


async def get_or_create_session(
    user_id: int,
    db: AsyncSession,
    module: str = "chat",
    guidance_mode: str = "socratic",
    session_id: int | None = None,
) -> CognitiveSession:
    if session_id:
        result = await db.execute(
            select(CognitiveSession).where(CognitiveSession.id == session_id, CognitiveSession.user_id == user_id)
        )
        session = result.scalar_one_or_none()
        if session:
            return session

    session = CognitiveSession(
        user_id=user_id,
        module=module,
        guidance_mode=guidance_mode,
        status="active",
    )
    db.add(session)
    await db.flush()
    return session


async def log_user_turn(
    session_id: int,
    content: str,
    stage: str,
    db: AsyncSession,
    turn_index: int = 0,
    mirror_level: str | None = None,
    zpd_band: str | None = None,
    hint_used: bool = False,
):
    turn = CognitiveTurn(
        session_id=session_id,
        turn_index=turn_index,
        stage=stage,
        role="user",
        content=content,
        mirror_level=mirror_level,
        zpd_band=zpd_band,
        hint_used=hint_used,
    )
    db.add(turn)
    await db.flush()
    return turn


async def log_assistant_turn(
    session_id: int,
    content: str,
    stage: str,
    db: AsyncSession,
    turn_index: int = 0,
    mirror_level: str | None = None,
    zpd_band: str | None = None,
):
    turn = CognitiveTurn(
        session_id=session_id,
        turn_index=turn_index,
        stage=stage,
        role="assistant",
        content=content,
        mirror_level=mirror_level,
        zpd_band=zpd_band,
        hint_used=False,
    )
    db.add(turn)
    await db.flush()
    return turn


async def log_reflection(
    user_id: int,
    session_id: int,
    reflection_text: str,
    db: AsyncSession,
    turn_id: int | None = None,
    quality_score: float | None = None,
):
    text = reflection_text.strip()
    if not text:
        return None
    entry = ReflectionEntry(
        user_id=user_id,
        session_id=session_id,
        turn_id=turn_id,
        reflection_text=text,
        quality_score=quality_score,
    )
    db.add(entry)
    await db.flush()
    return entry


async def log_tqi_metric(
    user_id: int,
    session_id: int | None,
    tqi_score: float,
    mirror_level: str | None,
    db: AsyncSession,
    details_json: dict | None = None,
):
    metric = TeachingQualityMetric(
        user_id=user_id,
        session_id=session_id,
        tqi_score=tqi_score,
        coherence_score=tqi_score,
        evidence_score=tqi_score,
        clarity_score=tqi_score,
        mirror_level=mirror_level,
        details_json=details_json,
    )
    db.add(metric)
    await db.flush()
    return metric
