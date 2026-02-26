"""真实世界任务服务 — 任务管理 + Claude Vision 验证。"""

import base64
import datetime
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.quest import QuestTemplate, UserQuest
from app.services.llm import chat_once_vision

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"

VERIFY_SYSTEM = """你是一位任务验证官。用户提交了一张截图作为完成任务的证据。
请验证截图是否满足任务要求。

返回 JSON（不要 markdown 代码块）：
{"passed": true/false, "feedback": "验证反馈", "score": 0-100}

评分标准：
- 截图是否包含任务要求的英文内容
- 英文使用是否正确
- 任务完成质量"""


async def get_available_quests(user_id: int, db: AsyncSession) -> list[dict]:
    """获取可用任务列表。"""
    result = await db.execute(select(QuestTemplate))
    templates = result.scalars().all()

    # Get user's active/completed quests
    result = await db.execute(
        select(UserQuest.template_id, UserQuest.status)
        .where(UserQuest.user_id == user_id)
    )
    user_quest_map = {tid: status for tid, status in result.all()}

    return [
        {
            "id": t.id, "title": t.title, "description": t.description,
            "difficulty": t.difficulty, "category": t.category,
            "requirements": t.requirements_json, "tips": t.tips_json,
            "xp_reward": t.xp_reward,
            "user_status": user_quest_map.get(t.id),
        }
        for t in templates
    ]


async def start_quest(template_id: int, user_id: int, db: AsyncSession) -> dict:
    """接受任务。"""
    result = await db.execute(select(QuestTemplate).where(QuestTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        return {"error": "任务不存在"}

    # Check if already active
    result = await db.execute(
        select(UserQuest).where(
            UserQuest.user_id == user_id, UserQuest.template_id == template_id,
            UserQuest.status.in_(["active", "submitted"])
        )
    )
    if result.scalar_one_or_none():
        return {"error": "任务已在进行中"}

    quest = UserQuest(user_id=user_id, template_id=template_id)
    db.add(quest)
    await db.flush()

    return {
        "id": quest.id, "template_id": template_id, "title": template.title,
        "status": quest.status, "started_at": quest.started_at.isoformat() if quest.started_at else "",
    }


async def submit_evidence(quest_id: int, evidence_url: str, user_id: int, db: AsyncSession) -> dict:
    """提交任务证据并进行AI验证。"""
    result = await db.execute(
        select(UserQuest).where(UserQuest.id == quest_id, UserQuest.user_id == user_id)
    )
    quest = result.scalar_one_or_none()
    if not quest or quest.status != "active":
        return {"error": "任务不存在或状态不正确"}

    # Get template
    result = await db.execute(select(QuestTemplate).where(QuestTemplate.id == quest.template_id))
    template = result.scalar_one_or_none()
    if not template:
        return {"error": "任务模板不存在"}

    quest.evidence_url = evidence_url
    quest.status = "submitted"

    # AI verification via Vision
    try:
        filepath = UPLOAD_DIR / evidence_url.split("/")[-1]
        image_data = filepath.read_bytes()
        image_b64 = base64.b64encode(image_data).decode()
        ext = filepath.suffix.lower().lstrip(".")
        media_type = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}.get(ext, "image/png")

        verify_prompt = f"任务：{template.title}\n要求：{template.description}\n具体要求：{template.requirements_json}\n\n请验证这张截图是否满足任务要求。"
        raw = await chat_once_vision(image_b64, VERIFY_SYSTEM, verify_prompt, media_type)

        import json
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        verification = json.loads(cleaned)
    except Exception:
        verification = {"passed": False, "feedback": "验证服务暂时不可用，请稍后重试", "score": 0}

    quest.ai_verification_json = verification

    if verification.get("passed"):
        quest.status = "verified"
        quest.completed_at = datetime.datetime.now(datetime.timezone.utc)
    else:
        quest.status = "active"  # Allow retry

    await db.flush()

    return {
        "passed": verification.get("passed", False),
        "feedback": verification.get("feedback", ""),
        "score": verification.get("score", 0),
    }


async def get_user_quests(user_id: int, db: AsyncSession) -> list[dict]:
    """获取用户的任务列表。"""
    result = await db.execute(
        select(UserQuest, QuestTemplate)
        .join(QuestTemplate, UserQuest.template_id == QuestTemplate.id)
        .where(UserQuest.user_id == user_id)
        .order_by(UserQuest.started_at.desc())
    )
    return [
        {
            "id": q.id, "template_id": q.template_id, "title": t.title,
            "difficulty": t.difficulty, "category": t.category, "xp_reward": t.xp_reward,
            "status": q.status, "evidence_url": q.evidence_url,
            "ai_verification": q.ai_verification_json,
            "started_at": q.started_at.isoformat() if q.started_at else "",
            "completed_at": q.completed_at.isoformat() if q.completed_at else None,
        }
        for q, t in result.all()
    ]


async def get_community_feed(db: AsyncSession, limit: int = 20) -> list[dict]:
    """获取社区完成展示。"""
    result = await db.execute(
        select(UserQuest, QuestTemplate)
        .join(QuestTemplate, UserQuest.template_id == QuestTemplate.id)
        .where(UserQuest.status == "verified")
        .order_by(UserQuest.completed_at.desc())
        .limit(limit)
    )
    return [
        {
            "quest_title": t.title, "difficulty": t.difficulty,
            "evidence_url": q.evidence_url,
            "score": (q.ai_verification_json or {}).get("score", 0),
            "completed_at": q.completed_at.isoformat() if q.completed_at else "",
        }
        for q, t in result.all()
    ]
