from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.writing import WritingSubmission
from app.schemas.writing import WritingSubmitRequest, WritingFeedback
from app.services.llm import chat_once

router = APIRouter(prefix="/writing", tags=["writing"])

GRADING_PROMPT = """你是一位英语写作批改老师。请对以下学生作文进行批改。
学生年级：{grade}

写作要求：{prompt}

学生作文：
{content}

请返回 JSON 格式：
{{"score": 0-100, "summary": "总评", "strengths": ["优点1"], "improvements": ["改进建议1"], "corrected_sentences": [{{"original": "原句", "corrected": "修改后", "reason": "原因"}}]}}"""

OUTLINE_PROMPT = """你是一位英语写作指导老师。请根据以下写作要求，为学生生成一份写作提纲。
学生年级：{grade}
CEFR 等级：{cefr}

写作要求：{prompt}

请返回 JSON 格式：
{{"title_suggestion": "建议标题", "structure": [{{"section": "段落名称", "key_points": ["要点1", "要点2"], "suggested_sentences": ["参考句型1"]}}], "vocabulary_hints": ["推荐词汇1"], "grammar_focus": ["注意语法点1"], "word_count_suggestion": 80}}"""

REVISION_PROMPT = """你是一位英语写作修改指导老师。请对学生的作文草稿提供逐段修改建议，帮助学生自主改进。
学生年级：{grade}

写作要求：{prompt}

学生草稿：
{content}

请返回 JSON 格式：
{{"overall_comment": "整体评价", "paragraph_feedback": [{{"paragraph_index": 0, "original": "原段落", "issues": ["问题1"], "suggestions": ["建议1"], "improved_version": "改进版本"}}], "language_tips": ["语言提升建议1"], "next_steps": ["下一步改进方向1"]}}"""


@router.post("/generate-outline")
async def generate_outline(
    req: WritingSubmitRequest,
    user: User = Depends(get_current_user),
):
    """生成写作提纲。"""
    import json
    prompt_text = OUTLINE_PROMPT.format(
        grade=user.grade,
        cefr=getattr(user, "cefr_level", "A2") or "A2",
        prompt=req.prompt,
    )
    raw = await chat_once(
        [{"role": "user", "content": prompt_text}],
        system_prompt="你是一位专业的英语写作指导老师，请严格按照要求的 JSON 格式返回提纲。",
    )
    try:
        return json.loads(raw)
    except Exception:
        return {"title_suggestion": "", "structure": [], "vocabulary_hints": [], "grammar_focus": [], "word_count_suggestion": 80, "raw": raw}


@router.post("/revision-guide")
async def revision_guide(
    req: WritingSubmitRequest,
    user: User = Depends(get_current_user),
):
    """生成修改指导。"""
    import json
    prompt_text = REVISION_PROMPT.format(
        grade=user.grade,
        prompt=req.prompt,
        content=req.content,
    )
    raw = await chat_once(
        [{"role": "user", "content": prompt_text}],
        system_prompt="你是一位专业的英语写作修改指导老师，请严格按照要求的 JSON 格式返回修改建议。",
    )
    try:
        return json.loads(raw)
    except Exception:
        return {"overall_comment": "", "paragraph_feedback": [], "language_tips": [], "next_steps": [], "raw": raw}


@router.post("/submit")
async def submit_writing(
    req: WritingSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    submission = WritingSubmission(
        user_id=user.id, prompt=req.prompt, content=req.content
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    # 调用 LLM 批改
    try:
        import json
        grading_text = GRADING_PROMPT.format(
            grade=user.grade, prompt=req.prompt, content=req.content
        )
        raw = await chat_once(
            [{"role": "user", "content": grading_text}],
            system_prompt="你是一位专业的英语写作批改老师，请严格按照要求的 JSON 格式返回批改结果。",
        )
        feedback = json.loads(raw)
        submission.score = feedback.get("score")
        submission.feedback_json = feedback
        await db.commit()
        await db.refresh(submission)
    except Exception:
        feedback = None

    # Award XP
    from app.services.xp import award_xp
    from app.services.missions import update_mission_progress
    xp_result = await award_xp(user.id, "writing", db)
    mission_result = await update_mission_progress(user.id, "writing", db)
    await db.commit()

    return {
        "id": submission.id,
        "score": submission.score,
        "feedback_json": submission.feedback_json,
        "created_at": submission.created_at.isoformat(),
        "xp": xp_result,
        "mission": mission_result,
    }


@router.get("/history")
async def writing_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WritingSubmission)
        .where(WritingSubmission.user_id == user.id)
        .order_by(WritingSubmission.created_at.desc())
        .limit(20)
    )
    return result.scalars().all()
