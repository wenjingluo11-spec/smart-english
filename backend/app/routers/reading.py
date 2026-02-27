"""阅读理解路由 — V3.1 认知增强版。

原有：
- GET /reading/materials — 列表
- GET /reading/{id} — 详情

V3.1 新增：
- GET /reading/{id}/analyze — 文章认知增强分析（分段、长难句、题文关联）
- POST /reading/{id}/submit-quiz — 提交阅读理解答案，返回认知增强反馈
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.reading import ReadingMaterial
from app.schemas.reading import ReadingMaterialOut, ReadingDetailOut
from app.services.reading_analysis import analyze_reading_material
from app.services.llm import judge_answer

router = APIRouter(prefix="/reading", tags=["reading"])


@router.get("/materials", response_model=list[ReadingMaterialOut])
async def list_materials(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReadingMaterial)
        .where(ReadingMaterial.cefr_level == user.cefr_level)
        .limit(20)
    )
    return result.scalars().all()


@router.get("/{material_id}", response_model=ReadingDetailOut)
async def get_material(
    material_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReadingMaterial).where(ReadingMaterial.id == material_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="阅读材料不存在")
    return material


# ── V3.1 新增 ──


@router.get("/{material_id}/analyze")
async def analyze_material(
    material_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """返回文章的认知增强分析（分段、长难句拆解、题文关联）。"""
    result = await db.execute(
        select(ReadingMaterial).where(ReadingMaterial.id == material_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="阅读材料不存在")

    analysis = await analyze_reading_material(
        db=db,
        material_id=material_id,
        content=material.content,
        questions_json=material.questions_json,
    )
    return analysis


class QuizSubmitRequest(BaseModel):
    question_index: int
    student_answer: str


@router.post("/{material_id}/submit-quiz")
async def submit_quiz_answer(
    material_id: int,
    req: QuizSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """提交阅读理解单题答案，返回认知增强反馈。"""
    result = await db.execute(
        select(ReadingMaterial).where(ReadingMaterial.id == material_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="阅读材料不存在")

    questions = (material.questions_json or {}).get("questions", [])
    if req.question_index < 0 or req.question_index >= len(questions):
        raise HTTPException(status_code=400, detail="题目序号无效")

    q = questions[req.question_index]
    correct_idx = q.get("answer", -1)
    options = q.get("options", [])
    question_text = q.get("question", "")
    options_text = "\n".join(f"{chr(65+i)}. {o}" for i, o in enumerate(options))

    full_question = f"(阅读理解题)\n{question_text}\n{options_text}"

    # 构建参考答案
    if isinstance(correct_idx, int) and 0 <= correct_idx < len(options):
        correct_letter = chr(65 + correct_idx)
        reference = f"{correct_letter}. {options[correct_idx]}"
    else:
        reference = str(correct_idx)
    explanation = q.get("explanation", "")
    if explanation:
        reference += f"\n解析：{explanation}"

    judgment = await judge_answer(full_question, reference, req.student_answer)

    return {
        "is_correct": judgment.get("is_correct", False),
        "correct_answer": judgment.get("correct_answer", ""),
        "explanation": judgment.get("explanation", ""),
        "how_to_spot": judgment.get("how_to_spot", ""),
        "key_clues": judgment.get("key_clues", []),
        "common_trap": judgment.get("common_trap", ""),
        "method": judgment.get("method", ""),
    }
