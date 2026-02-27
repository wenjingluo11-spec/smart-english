"""考试冲刺系统路由。"""

import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.exam import ExamProfile, DiagnosticSession, ExamKnowledgePoint, KnowledgeMastery, MockExam
from app.schemas.exam import (
    ExamProfileCreate, ExamProfileOut, DiagnosticStartRequest, DiagnosticSubmitRequest,
    GeneratePlanRequest, TrainingSubmitRequest, MockStartRequest, MockSubmitRequest,
    BreakthroughExerciseSubmit, ExamDashboardOut,
    FlowStartRequest, FlowAnswerRequest, FlowEndRequest,
    TimeRecordRequest, GeneFixSubmitRequest,
    CustomQuizGenerateRequest, CustomQuizSubmitRequest,
    SprintTaskCompleteRequest,
)
from app.services.exam_diagnostic import start_diagnostic, submit_diagnostic, generate_plan
from app.services.exam_training import (
    get_section_masteries, get_adaptive_questions, submit_training_answer,
    get_knowledge_points_with_mastery, SECTION_STRATEGIES,
)
from app.services.exam_mock import start_mock, submit_mock, get_mock_result
from app.services.exam_weakness import get_weakness_list, start_breakthrough, submit_breakthrough_exercise
from app.services.exam_prediction import predict_score, get_prediction_history, generate_weekly_report
from app.services.exam_flow import start_flow, submit_flow_answer, end_flow, get_flow_history
from app.services.exam_time import calculate_time_budgets, record_time_data, get_time_history, analyze_time_patterns
from app.services.exam_error_gene import analyze_error_genes, get_error_genes, generate_fix_drill, submit_fix_answer
from app.services.exam_custom import generate_custom_quiz, submit_custom_quiz, get_custom_history
from app.services.exam_sprint_plan import get_or_generate_sprint_plan, complete_sprint_task
from app.services.exam_replay import generate_replay_data
from app.services.cloze_analysis import analyze_cloze
from app.services.xp import award_xp
from app.services.missions import update_mission_progress

router = APIRouter(prefix="/exam", tags=["exam"])


# ── 考试档案 ──

@router.post("/profile")
async def create_or_update_profile(
    req: ExamProfileCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if profile:
        profile.exam_type = req.exam_type
        profile.province = req.province
        profile.target_score = req.target_score
        profile.exam_date = req.exam_date
    else:
        profile = ExamProfile(
            user_id=user.id,
            exam_type=req.exam_type,
            province=req.province,
            target_score=req.target_score,
            exam_date=req.exam_date,
        )
        db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return _profile_to_dict(profile)


@router.get("/profile")
async def get_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        return None
    return _profile_to_dict(profile)


@router.get("/dashboard")
async def get_dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        return {"profile": None}

    import datetime
    days_remaining = None
    try:
        exam_dt = datetime.date.fromisoformat(profile.exam_date)
        days_remaining = (exam_dt - datetime.date.today()).days
    except Exception:
        pass

    masteries = await get_section_masteries(user.id, profile.exam_type, db)

    # 最近模考
    mock_result = await db.execute(
        select(MockExam)
        .where(MockExam.user_id == user.id, MockExam.status == "completed")
        .order_by(MockExam.completed_at.desc())
        .limit(5)
    )
    recent_mocks = []
    for m in mock_result.scalars().all():
        score_data = json.loads(m.score_json) if m.score_json else {}
        recent_mocks.append({
            "id": m.id,
            "total": score_data.get("total", 0),
            "max": score_data.get("max", 150),
            "completed_at": m.completed_at.isoformat() if m.completed_at else "",
        })

    # 薄弱点数量
    weaknesses = await get_weakness_list(user.id, profile.exam_type, db)
    weak_count = len([w for w in weaknesses if w["mastery"] < 0.6])

    return {
        "profile": _profile_to_dict(profile),
        "days_remaining": days_remaining,
        "section_masteries": masteries,
        "recent_mock_scores": recent_mocks,
        "weak_count": weak_count,
    }


# ── 入学诊断 ──

@router.post("/diagnostic/start")
async def diagnostic_start(
    req: DiagnosticStartRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await start_diagnostic(user.id, req.exam_type, db)
    await db.commit()
    return result


@router.post("/diagnostic/submit")
async def diagnostic_submit(
    req: DiagnosticSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await submit_diagnostic(req.session_id, req.answers, user.id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    xp_result = await award_xp(user.id, "diagnostic_complete", db)
    result["xp"] = xp_result
    await db.commit()
    return result


@router.get("/diagnostic/result/{session_id}")
async def diagnostic_result(
    session_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DiagnosticSession)
        .where(DiagnosticSession.id == session_id, DiagnosticSession.user_id == user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "诊断会话不存在")
    return {
        "id": session.id,
        "status": session.status,
        "questions_json": json.loads(session.questions_json) if session.questions_json else [],
        "answers_json": json.loads(session.answers_json) if session.answers_json else [],
        "result_json": json.loads(session.result_json) if session.result_json else None,
        "ai_analysis_json": json.loads(session.ai_analysis_json) if session.ai_analysis_json else None,
    }


@router.post("/diagnostic/generate-plan")
async def diagnostic_generate_plan(
    req: GeneratePlanRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await generate_plan(req.session_id, user.id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await db.commit()
    return result


# ── 专项训练 ──

@router.get("/training/sections")
async def training_sections(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile_result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user.id)
    )
    profile = profile_result.scalar_one_or_none()
    exam_type = profile.exam_type if profile else "zhongkao"
    return await get_section_masteries(user.id, exam_type, db)


@router.get("/training/{section}/questions")
async def training_questions(
    section: str,
    limit: int = Query(default=5, ge=1, le=20),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile_result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user.id)
    )
    profile = profile_result.scalar_one_or_none()
    exam_type = profile.exam_type if profile else "zhongkao"
    questions = await get_adaptive_questions(user.id, exam_type, section, limit, db)
    strategy = SECTION_STRATEGIES.get(section, "")
    return {"questions": questions, "strategy": strategy}


@router.post("/training/submit")
async def training_submit(
    req: TrainingSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await submit_training_answer(user.id, req.question_id, req.answer, db)
    if "error" in result:
        raise HTTPException(400, result["error"])

    # 题眼分析（认知增强）— 答题后自动触发
    from app.services.question_analysis import analyze_question
    from app.models.exam import ExamQuestion
    q_result = await db.execute(select(ExamQuestion).where(ExamQuestion.id == req.question_id))
    eq = q_result.scalar_one_or_none()
    if eq:
        options_text = ""
        if eq.options_json:
            try:
                opts = json.loads(eq.options_json) if isinstance(eq.options_json, str) else eq.options_json
                if isinstance(opts, dict):
                    options_text = "\n".join(f"{k}. {v}" for k, v in opts.items())
                elif isinstance(opts, list):
                    options_text = "\n".join(str(o) for o in opts)
            except Exception:
                pass
        analysis = await analyze_question(
            db=db,
            question_content=eq.content,
            question_type=eq.section or "",
            options=options_text,
            question_id=eq.id,
        )
        result["analysis"] = analysis

    if result.get("is_correct"):
        xp_result = await award_xp(user.id, "training_correct", db)
        await update_mission_progress(user.id, "exam_training", db)
        result["xp"] = xp_result
    else:
        from app.services.error_notebook import auto_collect_error
        await auto_collect_error(
            user_id=user.id,
            source_type="exam",
            question_snapshot=result.get("question_content", ""),
            user_answer=req.answer,
            correct_answer=result.get("correct_answer", ""),
            explanation=result.get("explanation", ""),
            db=db,
            question_id=req.question_id,
        )
    await db.commit()
    return result


@router.get("/training/knowledge-points")
async def training_knowledge_points(
    section: str = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile_result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user.id)
    )
    profile = profile_result.scalar_one_or_none()
    exam_type = profile.exam_type if profile else "zhongkao"
    return await get_knowledge_points_with_mastery(user.id, exam_type, section, db)


# ── 模拟考试 ──

@router.post("/mock/start")
async def mock_start(
    req: MockStartRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await start_mock(user.id, req.exam_type, db)
    await db.commit()
    return result


@router.post("/mock/submit")
async def mock_submit(
    req: MockSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await submit_mock(user.id, req.mock_id, req.answers, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    # Auto-collect wrong answers from mock
    if result.get("wrong_questions"):
        from app.services.error_notebook import auto_collect_error
        for wq in result["wrong_questions"]:
            await auto_collect_error(
                user_id=user.id,
                source_type="mock",
                question_snapshot=wq.get("content", ""),
                user_answer=wq.get("user_answer", ""),
                correct_answer=wq.get("correct_answer", ""),
                explanation=wq.get("explanation", ""),
                db=db,
                question_type=wq.get("question_type", ""),
                topic=wq.get("topic", ""),
            )
    xp_result = await award_xp(user.id, "mock_complete", db)
    result["xp"] = xp_result
    await db.commit()
    return result


@router.get("/mock/result/{mock_id}")
async def mock_result(
    mock_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await get_mock_result(user.id, mock_id, db)
    if not result:
        raise HTTPException(404, "模考不存在")
    return result


@router.get("/mock/history")
async def mock_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MockExam)
        .where(MockExam.user_id == user.id)
        .order_by(MockExam.started_at.desc())
        .limit(20)
    )
    mocks = result.scalars().all()
    return [
        {
            "id": m.id, "exam_type": m.exam_type, "status": m.status,
            "total_score": json.loads(m.score_json).get("total", 0) if m.score_json else None,
            "max_score": json.loads(m.score_json).get("max", 150) if m.score_json else None,
            "started_at": m.started_at.isoformat() if m.started_at else "",
            "completed_at": m.completed_at.isoformat() if m.completed_at else None,
        }
        for m in mocks
    ]


# ── 薄弱点突破 ──

@router.get("/weakness/list")
async def weakness_list(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile_result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user.id)
    )
    profile = profile_result.scalar_one_or_none()
    exam_type = profile.exam_type if profile else "zhongkao"
    return await get_weakness_list(user.id, exam_type, db)


@router.post("/weakness/start/{kp_id}")
async def weakness_start(
    kp_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await start_breakthrough(user.id, kp_id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await db.commit()
    return result


@router.post("/weakness/exercise")
async def weakness_exercise(
    req: BreakthroughExerciseSubmit,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await submit_breakthrough_exercise(
        req.breakthrough_id, req.exercise_index, req.answer, user.id, db
    )
    if "error" in result:
        raise HTTPException(400, result["error"])
    if result.get("is_correct"):
        xp_result = await award_xp(user.id, "breakthrough_complete", db)
        result["xp"] = xp_result
    await db.commit()
    return result


@router.get("/weakness/{breakthrough_id}")
async def weakness_detail(
    breakthrough_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.exam import WeaknessBreakthrough
    result = await db.execute(
        select(WeaknessBreakthrough)
        .where(WeaknessBreakthrough.id == breakthrough_id, WeaknessBreakthrough.user_id == user.id)
    )
    bt = result.scalar_one_or_none()
    if not bt:
        raise HTTPException(404, "突破记录不存在")
    kp_result = await db.execute(
        select(ExamKnowledgePoint).where(ExamKnowledgePoint.id == bt.knowledge_point_id)
    )
    kp = kp_result.scalar_one_or_none()
    return {
        "id": bt.id, "knowledge_point_id": bt.knowledge_point_id,
        "name": kp.name if kp else "",
        "status": bt.status, "phase": bt.phase,
        "micro_lesson_json": json.loads(bt.micro_lesson_json) if bt.micro_lesson_json else None,
        "exercises_json": json.loads(bt.exercises_json) if bt.exercises_json else [],
        "total_exercises": bt.total_exercises, "completed_exercises": bt.completed_exercises,
        "mastery_before": bt.mastery_before, "mastery_after": bt.mastery_after,
    }


# ── 分数预测 ──

@router.get("/prediction")
async def prediction(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await predict_score(user.id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await db.commit()
    return result


@router.get("/prediction/history")
async def prediction_history_route(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_prediction_history(user.id, db)


@router.get("/report/weekly")
async def weekly_report(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await generate_weekly_report(user.id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await db.commit()
    return result


# ── helpers ──

def _profile_to_dict(p: ExamProfile) -> dict:
    return {
        "id": p.id, "exam_type": p.exam_type, "province": p.province,
        "target_score": p.target_score, "exam_date": p.exam_date,
        "current_estimated_score": p.current_estimated_score,
        "plan_json": json.loads(p.plan_json) if p.plan_json else None,
    }


# ── 心流刷题 ──

@router.post("/flow/start")
async def flow_start(
    req: FlowStartRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await start_flow(user.id, req.section, db)
    await db.commit()
    return result


@router.post("/flow/answer")
async def flow_answer(
    req: FlowAnswerRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await submit_flow_answer(
        user.id, req.session_id, req.question_id, req.answer, req.response_ms, db
    )
    if "error" in result:
        raise HTTPException(400, result["error"])

    # 题眼分析（认知增强）— 答题后自动触发
    from app.services.question_analysis import analyze_question
    from app.models.exam import ExamQuestion
    q_result = await db.execute(select(ExamQuestion).where(ExamQuestion.id == req.question_id))
    eq = q_result.scalar_one_or_none()
    if eq:
        options_text = ""
        if eq.options_json:
            try:
                opts = json.loads(eq.options_json) if isinstance(eq.options_json, str) else eq.options_json
                if isinstance(opts, dict):
                    options_text = "\n".join(f"{k}. {v}" for k, v in opts.items())
                elif isinstance(opts, list):
                    options_text = "\n".join(str(o) for o in opts)
            except Exception:
                pass
        analysis = await analyze_question(
            db=db,
            question_content=eq.content,
            question_type=eq.section or "",
            options=options_text,
            question_id=eq.id,
        )
        result["analysis"] = analysis

    # XP & missions
    await award_xp(user.id, "flow_question", db)
    if result.get("milestone"):
        await award_xp(user.id, f"flow_milestone_{result['milestone']}", db)
    await update_mission_progress(user.id, "exam_training", db)
    await db.commit()
    return result


@router.post("/flow/end")
async def flow_end(
    req: FlowEndRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await end_flow(user.id, req.session_id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await award_xp(user.id, "flow_complete", db)
    await db.commit()
    return result


@router.get("/flow/history")
async def flow_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_flow_history(user.id, db)


# ── 时间沙漏 ──

@router.post("/time/record")
async def time_record(
    req: TimeRecordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await record_time_data(user.id, req.session_type, req.session_id, req.time_entries, db)
    if result.get("on_budget_rate", 0) >= 0.8:
        await award_xp(user.id, "time_mastery_session", db)
    await db.commit()
    return result


@router.get("/time/history")
async def time_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_time_history(user.id, db)


@router.get("/time/analysis")
async def time_analysis(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await analyze_time_patterns(user.id, db)
    await db.commit()
    return result


# ── 错题基因 ──

@router.get("/error-genes")
async def error_genes_list(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_error_genes(user.id, db)


@router.post("/error-genes/analyze")
async def error_genes_analyze(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await analyze_error_genes(user.id, db)
    await db.commit()
    return result


@router.post("/error-genes/{gene_id}/fix")
async def error_genes_fix(
    gene_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await generate_fix_drill(user.id, gene_id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await db.commit()
    return result


@router.post("/error-genes/submit")
async def error_genes_submit(
    req: GeneFixSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await submit_fix_answer(user.id, req.gene_id, req.exercise_index, req.answer, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    if result.get("gene_status") == "fixed":
        await award_xp(user.id, "gene_fix", db)
    await db.commit()
    return result


# ── AI 出题官 ──

@router.post("/custom/generate")
async def custom_generate(
    req: CustomQuizGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await generate_custom_quiz(user.id, req.prompt, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await db.commit()
    return result


@router.post("/custom/submit")
async def custom_submit(
    req: CustomQuizSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await submit_custom_quiz(user.id, req.session_id, req.answers, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await award_xp(user.id, "custom_quiz_complete", db)
    await db.commit()
    return result


@router.get("/custom/history")
async def custom_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_custom_history(user.id, db)


# ── 每日冲刺计划 ──

@router.get("/sprint-plan/today")
async def sprint_plan_today(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await get_or_generate_sprint_plan(user.id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await db.commit()
    return result


@router.post("/sprint-plan/complete-task")
async def sprint_complete_task(
    req: SprintTaskCompleteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await complete_sprint_task(user.id, req.plan_id, req.task_index, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await award_xp(user.id, "sprint_task_complete", db)
    if result.get("all_done"):
        await award_xp(user.id, "sprint_all_done", db)
    await db.commit()
    return result


# ── 考场复盘剧场 ──

@router.get("/replay")
async def replay_data(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await generate_replay_data(user.id, db)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await db.commit()
    return result


# ── V3.2 完形填空认知增强 ──

from pydantic import BaseModel as _BaseModel


class ClozeAnalyzeRequest(_BaseModel):
    passage_text: str
    questions: list[dict]


@router.post("/cloze/analyze")
async def cloze_analyze(
    req: ClozeAnalyzeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """分析完形填空的语境线索和解题策略。"""
    result = await analyze_cloze(db, req.passage_text, req.questions)
    return result
