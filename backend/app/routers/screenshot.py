"""截图学英语路由。"""

from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.screenshot import ScreenshotLesson
from app.schemas.screenshot import ScreenshotExerciseSubmit
from app.services.screenshot import analyze_screenshot, check_exercise
from app.services.xp import award_xp
from app.services.missions import update_mission_progress

router = APIRouter(prefix="/screenshot", tags=["screenshot"])


@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    source_type: str = Form("other"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """上传截图并获取 AI 分析结果。"""
    # 先上传图片
    from app.routers.upload import UPLOAD_DIR, ALLOWED_TYPES, MAX_SIZE
    import uuid

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "仅支持 PNG/JPEG/WebP/GIF 图片")
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "图片大小不能超过 10MB")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "png"
    filename = f"{user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    (UPLOAD_DIR / filename).write_bytes(data)
    image_url = f"/uploads/{filename}"

    try:
        lesson = await analyze_screenshot(image_url, source_type, user.id, db)
    except Exception as e:
        raise HTTPException(500, f"分析失败: {str(e)}")

    xp_result = await award_xp(user.id, "screenshot", db)
    mission_result = await update_mission_progress(user.id, "screenshot", db)
    await db.commit()

    return {
        "id": lesson.id,
        "image_url": lesson.image_url,
        "source_type": lesson.source_type,
        "extracted_text": lesson.extracted_text,
        "analysis": lesson.analysis_json,
        "created_at": lesson.created_at.isoformat() if lesson.created_at else "",
        "xp": xp_result,
        "mission": mission_result,
    }


@router.get("/history")
async def history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ScreenshotLesson)
        .where(ScreenshotLesson.user_id == user.id)
        .order_by(ScreenshotLesson.created_at.desc())
        .limit(20)
    )
    lessons = result.scalars().all()
    return [
        {
            "id": l.id, "image_url": l.image_url, "source_type": l.source_type,
            "extracted_text": l.extracted_text, "analysis": l.analysis_json,
            "created_at": l.created_at.isoformat() if l.created_at else "",
        }
        for l in lessons
    ]


@router.post("/exercise")
async def submit_exercise(
    req: ScreenshotExerciseSubmit,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ScreenshotLesson).where(ScreenshotLesson.id == req.lesson_id, ScreenshotLesson.user_id == user.id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(404, "学习记录不存在")

    check = await check_exercise(lesson, req.exercise_index, req.answer)
    if check.get("is_correct"):
        xp_result = await award_xp(user.id, "screenshot", db)
        check["xp"] = xp_result
    await db.commit()
    return check
