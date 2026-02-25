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


@router.post("/submit", response_model=WritingFeedback)
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

    # TODO: 异步批改，这里先同步返回占位
    return WritingFeedback(
        id=submission.id,
        score=None,
        feedback_json=None,
        created_at=submission.created_at.isoformat(),
    )


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
