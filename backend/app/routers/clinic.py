"""AI错题诊所路由。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.clinic import ErrorPattern, TreatmentPlan
from app.schemas.clinic import TreatmentExerciseSubmit
from app.services.clinic import run_diagnosis, generate_treatment, submit_exercise
from app.services.xp import award_xp
from app.services.missions import update_mission_progress

router = APIRouter(prefix="/clinic", tags=["clinic"])


@router.post("/diagnose")
async def diagnose(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """触发全面诊断，返回错误模式。"""
    report = await run_diagnosis(user.id, db)
    await db.commit()
    return report


@router.get("/patterns")
async def get_patterns(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ErrorPattern)
        .where(ErrorPattern.user_id == user.id)
        .order_by(ErrorPattern.created_at.desc())
    )
    patterns = result.scalars().all()
    return [
        {
            "id": p.id, "pattern_type": p.pattern_type, "title": p.title,
            "description": p.description, "severity": p.severity,
            "evidence_json": p.evidence_json, "diagnosis_json": p.diagnosis_json,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else "",
        }
        for p in patterns
    ]


@router.get("/pattern/{pattern_id}")
async def get_pattern(
    pattern_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ErrorPattern).where(ErrorPattern.id == pattern_id, ErrorPattern.user_id == user.id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "错误模式不存在")
    return {
        "id": p.id, "pattern_type": p.pattern_type, "title": p.title,
        "description": p.description, "severity": p.severity,
        "evidence_json": p.evidence_json, "diagnosis_json": p.diagnosis_json,
        "status": p.status,
        "created_at": p.created_at.isoformat() if p.created_at else "",
    }


@router.post("/treat/{pattern_id}")
async def treat(
    pattern_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """为错误模式生成治疗计划。"""
    result = await generate_treatment(pattern_id, user.id, db)
    if "error" in result:
        raise HTTPException(404, result["error"])
    await db.commit()
    return result


@router.post("/exercise")
async def exercise(
    req: TreatmentExerciseSubmit,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await submit_exercise(req.plan_id, req.exercise_index, req.answer, user.id, db)
    if "error" in result:
        raise HTTPException(404, result["error"])

    if result.get("is_correct"):
        xp_result = await award_xp(user.id, "clinic_exercise", db)
        mission_result = await update_mission_progress(user.id, "clinic", db)
        result["xp"] = xp_result
        result["mission"] = mission_result

    await db.commit()
    return result
