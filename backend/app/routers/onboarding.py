"""新手引导路由。"""

import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.onboarding import OnboardingProfile
from app.schemas.onboarding import AssessmentSubmit, GoalsSubmit
from app.services.onboarding import (
    generate_assessment_questions,
    evaluate_assessment,
    recommend_learning_path,
)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


async def _get_or_create_profile(user_id: int, db: AsyncSession) -> OnboardingProfile:
    result = await db.execute(
        select(OnboardingProfile).where(OnboardingProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = OnboardingProfile(user_id=user_id, completed_steps_json=[])
        db.add(profile)
        await db.flush()
    return profile


@router.get("/status")
async def onboarding_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """检查引导状态。"""
    result = await db.execute(
        select(OnboardingProfile).where(OnboardingProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        return {"completed": False, "current_step": "assessment"}

    steps = profile.completed_steps_json or []
    if profile.completed_at:
        return {
            "completed": True,
            "current_step": "done",
            "assessment_score": profile.assessment_score,
            "cefr_level": profile.assessment_result_json.get("cefr_level") if profile.assessment_result_json else None,
            "recommended_path": profile.recommended_path,
        }

    if "assessment" not in steps:
        current = "assessment"
    elif "goals" not in steps:
        current = "goals"
    elif "tour" not in steps:
        current = "tour"
    else:
        current = "done"

    return {
        "completed": False,
        "current_step": current,
        "assessment_score": profile.assessment_score,
        "cefr_level": profile.assessment_result_json.get("cefr_level") if profile.assessment_result_json else None,
        "recommended_path": profile.recommended_path,
    }


@router.get("/assessment")
async def get_assessment(
    user: User = Depends(get_current_user),
):
    """获取测评题目。"""
    return {"questions": generate_assessment_questions()}


@router.post("/assessment")
async def submit_assessment(
    req: AssessmentSubmit,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """提交测评答案。"""
    result = evaluate_assessment(req.answers)
    profile = await _get_or_create_profile(user.id, db)
    profile.assessment_score = result["score"]
    profile.assessment_result_json = result

    steps = profile.completed_steps_json or []
    if "assessment" not in steps:
        steps.append("assessment")
    profile.completed_steps_json = steps

    # Update user CEFR level
    user.cefr_level = result["cefr_level"]

    await db.commit()
    return result


@router.post("/goals")
async def submit_goals(
    req: GoalsSubmit,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """设定学习目标。"""
    profile = await _get_or_create_profile(user.id, db)
    profile.daily_goal_minutes = req.daily_goal_minutes
    profile.target_exam = req.target_exam

    # Generate recommended path
    cefr = user.cefr_level or "A1"
    profile.recommended_path = recommend_learning_path(cefr, req.target_exam)

    steps = profile.completed_steps_json or []
    if "goals" not in steps:
        steps.append("goals")
    profile.completed_steps_json = steps

    await db.commit()
    return {
        "daily_goal_minutes": profile.daily_goal_minutes,
        "target_exam": profile.target_exam,
        "recommended_path": profile.recommended_path,
    }


@router.post("/complete")
async def complete_onboarding(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """完成引导。"""
    profile = await _get_or_create_profile(user.id, db)

    steps = profile.completed_steps_json or []
    if "tour" not in steps:
        steps.append("tour")
    profile.completed_steps_json = steps
    profile.completed_at = datetime.datetime.now(datetime.timezone.utc)

    await db.commit()
    return {"completed": True}
