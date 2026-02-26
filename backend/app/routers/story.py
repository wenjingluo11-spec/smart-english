"""AI剧情引擎路由。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.story import StoryTemplate, StorySession, StoryChapter
from app.schemas.story import StoryStartRequest, StoryChoiceRequest, StoryChallengeSubmit
from app.services.story import start_story, make_choice, submit_challenge
from app.services.xp import award_xp
from app.services.missions import update_mission_progress

router = APIRouter(prefix="/story", tags=["story"])


@router.get("/templates")
async def get_templates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StoryTemplate))
    templates = result.scalars().all()
    return [
        {"id": t.id, "title": t.title, "genre": t.genre, "cefr_min": t.cefr_min,
         "cefr_max": t.cefr_max, "synopsis": t.synopsis, "cover_emoji": t.cover_emoji}
        for t in templates
    ]


@router.post("/start")
async def start(
    req: StoryStartRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await start_story(req.template_id, user.id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    xp_result = await award_xp(user.id, "story_chapter", db)
    result["xp"] = xp_result
    await db.commit()
    return result


@router.get("/sessions")
async def get_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StorySession).where(StorySession.user_id == user.id).order_by(StorySession.started_at.desc())
    )
    sessions = result.scalars().all()
    out = []
    for s in sessions:
        t_result = await db.execute(select(StoryTemplate).where(StoryTemplate.id == s.template_id))
        t = t_result.scalar_one_or_none()
        out.append({
            "id": s.id, "template_id": s.template_id,
            "template_title": t.title if t else "", "cover_emoji": t.cover_emoji if t else "📖",
            "current_chapter": s.current_chapter, "total_chapters": s.total_chapters,
            "status": s.status, "started_at": s.started_at.isoformat() if s.started_at else "",
        })
    return out


@router.get("/session/{session_id}")
async def get_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StorySession).where(StorySession.id == session_id, StorySession.user_id == user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "故事不存在")

    t_result = await db.execute(select(StoryTemplate).where(StoryTemplate.id == session.template_id))
    template = t_result.scalar_one_or_none()

    ch_result = await db.execute(
        select(StoryChapter).where(StoryChapter.session_id == session_id).order_by(StoryChapter.chapter_number)
    )
    chapters = ch_result.scalars().all()

    return {
        "session": {
            "id": session.id, "template_id": session.template_id,
            "template_title": template.title if template else "",
            "current_chapter": session.current_chapter, "total_chapters": session.total_chapters,
            "status": session.status, "started_at": session.started_at.isoformat() if session.started_at else "",
        },
        "chapters": [
            {
                "id": ch.id, "chapter_number": ch.chapter_number,
                "narrative_text": ch.narrative_text, "choices": ch.choices_json,
                "challenge": ch.challenge_json, "chosen_option": ch.chosen_option,
                "learning_points": ch.learning_points_json,
            }
            for ch in chapters
        ],
    }


@router.post("/choice")
async def choice(
    req: StoryChoiceRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await make_choice(req.session_id, req.choice, user.id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    xp_result = await award_xp(user.id, "story_chapter", db)
    mission_result = await update_mission_progress(user.id, "story", db)
    result["xp"] = xp_result
    result["mission"] = mission_result
    await db.commit()
    return result


@router.post("/challenge")
async def challenge(
    req: StoryChallengeSubmit,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await submit_challenge(req.session_id, req.chapter_id, req.answer, user.id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    if result.get("is_correct"):
        xp_result = await award_xp(user.id, "story_chapter", db)
        result["xp"] = xp_result
    await db.commit()
    return result
