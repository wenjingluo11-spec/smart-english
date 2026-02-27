"""认知增强路由 — 审题演示、人工标注管理。"""

import json
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.question import Question
from app.models.exam import ExamQuestion
from app.models.question_analysis import HumanAnnotation
from app.services.question_analysis import generate_gaze_path, analyze_question, analyze_long_stem
from app.services.tts import synthesize_with_timestamps

router = APIRouter(prefix="/cognitive", tags=["cognitive"])


# ── 审题演示 ──


@router.get("/demo/practice/{question_id}")
async def get_practice_demo(
    question_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取练习题的学霸审题演示数据（gaze_path + narration + TTS 时间戳）。"""
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(404, "题目不存在")

    options_text = ""
    if q.options_json:
        try:
            opts = json.loads(q.options_json) if isinstance(q.options_json, str) else q.options_json
            if isinstance(opts, dict):
                options_text = "\n".join(f"{k}. {v}" for k, v in opts.items())
            elif isinstance(opts, list):
                options_text = "\n".join(str(o) for o in opts)
        except Exception:
            pass

    # 生成审题轨迹
    demo = await generate_gaze_path(
        db=db,
        question_content=q.content,
        question_type=q.question_type or "",
        options=options_text,
        question_id=q.id,
    )

    # 为旁白生成 TTS 时间戳（用于视听同步）
    tts_data = None
    if demo.get("narration"):
        try:
            tts_data = await synthesize_with_timestamps(demo["narration"])
        except Exception:
            pass

    return {
        "question_id": question_id,
        "question_content": q.content,
        "demo": demo,
        "tts": tts_data,
    }


@router.get("/demo/exam/{question_id}")
async def get_exam_demo(
    question_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取考试题的学霸审题演示数据。"""
    result = await db.execute(select(ExamQuestion).where(ExamQuestion.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(404, "题目不存在")

    options_text = ""
    if q.options_json:
        try:
            opts = json.loads(q.options_json) if isinstance(q.options_json, str) else q.options_json
            if isinstance(opts, dict):
                options_text = "\n".join(f"{k}. {v}" for k, v in opts.items())
            elif isinstance(opts, list):
                options_text = "\n".join(str(o) for o in opts)
        except Exception:
            pass

    demo = await generate_gaze_path(
        db=db,
        question_content=q.content,
        question_type=q.section or "",
        options=options_text,
        question_id=q.id,
    )

    tts_data = None
    if demo.get("narration"):
        try:
            tts_data = await synthesize_with_timestamps(demo["narration"])
        except Exception:
            pass

    return {
        "question_id": question_id,
        "question_content": q.content,
        "demo": demo,
        "tts": tts_data,
    }


# ── 人工标注管理 ──


# ── 独立题目分析 API ──


@router.get("/analysis/practice/{question_id}")
async def get_practice_analysis(
    question_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取练习题的题眼分析数据（key_phrases / reading_order / strategy / distractors），不含 gaze_path 和 TTS。"""
    result = await db.execute(select(Question).where(Question.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(404, "题目不存在")

    options_text = ""
    if q.options_json:
        try:
            opts = json.loads(q.options_json) if isinstance(q.options_json, str) else q.options_json
            if isinstance(opts, dict):
                options_text = "\n".join(f"{k}. {v}" for k, v in opts.items())
            elif isinstance(opts, list):
                options_text = "\n".join(str(o) for o in opts)
        except Exception:
            pass

    analysis = await analyze_question(
        db=db,
        question_content=q.content,
        question_type=q.question_type or "",
        options=options_text,
        question_id=q.id,
    )
    return {"question_id": question_id, "analysis": analysis}


@router.get("/analysis/exam/{question_id}")
async def get_exam_analysis(
    question_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取考试题的题眼分析数据。"""
    result = await db.execute(select(ExamQuestion).where(ExamQuestion.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(404, "题目不存在")

    options_text = ""
    if q.options_json:
        try:
            opts = json.loads(q.options_json) if isinstance(q.options_json, str) else q.options_json
            if isinstance(opts, dict):
                options_text = "\n".join(f"{k}. {v}" for k, v in opts.items())
            elif isinstance(opts, list):
                options_text = "\n".join(str(o) for o in opts)
        except Exception:
            pass

    analysis = await analyze_question(
        db=db,
        question_content=q.content,
        question_type=q.section or "",
        options=options_text,
        question_id=q.id,
    )
    return {"question_id": question_id, "analysis": analysis}


# ── 人工标注 CRUD ──


class AnnotationCreate(BaseModel):
    question_id: int
    gaze_path: list[dict]
    narration: str = ""
    notes: str = ""


class AnnotationOut(BaseModel):
    id: int
    annotator_id: int
    question_id: int
    gaze_path: list[dict]
    narration: str
    notes: str
    quality_score: int | None


@router.post("/annotations")
async def create_annotation(
    req: AnnotationCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """提交人工审题标注数据。"""
    annotation = HumanAnnotation(
        annotator_id=user.id,
        question_id=req.question_id,
        gaze_path_json=json.dumps(req.gaze_path, ensure_ascii=False),
        narration=req.narration,
        notes=req.notes,
    )
    db.add(annotation)
    await db.commit()
    await db.refresh(annotation)
    return {
        "id": annotation.id,
        "annotator_id": annotation.annotator_id,
        "question_id": annotation.question_id,
        "created_at": str(annotation.created_at),
    }


@router.get("/annotations/{question_id}")
async def get_annotations(
    question_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取某题目的所有人工标注。"""
    result = await db.execute(
        select(HumanAnnotation)
        .where(HumanAnnotation.question_id == question_id)
        .order_by(HumanAnnotation.quality_score.desc().nullslast())
    )
    annotations = result.scalars().all()
    return [
        {
            "id": a.id,
            "annotator_id": a.annotator_id,
            "question_id": a.question_id,
            "gaze_path": json.loads(a.gaze_path_json) if a.gaze_path_json else [],
            "narration": a.narration or "",
            "notes": a.notes or "",
            "quality_score": a.quality_score,
            "created_at": str(a.created_at),
        }
        for a in annotations
    ]


@router.put("/annotations/{annotation_id}/score")
async def rate_annotation(
    annotation_id: int,
    score: int = Query(..., ge=1, le=5),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """给人工标注评分（1-5分）。"""
    result = await db.execute(
        select(HumanAnnotation).where(HumanAnnotation.id == annotation_id)
    )
    annotation = result.scalar_one_or_none()
    if not annotation:
        raise HTTPException(404, "标注不存在")
    annotation.quality_score = score
    await db.commit()
    return {"id": annotation_id, "quality_score": score}


# ── 长题干审题辅助 ──


class LongStemRequest(BaseModel):
    question_content: str
    question_type: str = ""
    options: str = ""


@router.post("/long-stem/analyze")
async def analyze_long_stem_endpoint(
    req: LongStemRequest,
    user: User = Depends(get_current_user),
):
    """分析长题干结构，帮助学生快速定位关键信息。"""
    result = await analyze_long_stem(
        question_content=req.question_content,
        question_type=req.question_type,
        options=req.options,
    )
    return result
