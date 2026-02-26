"""错题基因服务 — AI 错误模式分析与修复。"""

import json
import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.exam import ErrorGene, MockExam, DiagnosticSession
from app.services.llm import chat_once_json


async def analyze_error_genes(user_id: int, db: AsyncSession) -> list[dict]:
    """分析用户错题（从模考和诊断中提取），聚类出错误基因。"""
    error_summaries = []

    # 从模考中提取错题
    mock_result = await db.execute(
        select(MockExam)
        .where(MockExam.user_id == user_id, MockExam.status == "completed")
        .order_by(MockExam.completed_at.desc())
        .limit(10)
    )
    for mock in mock_result.scalars().all():
        sections = json.loads(mock.sections_json) if mock.sections_json else []
        answers = json.loads(mock.answers_json) if mock.answers_json else []
        answer_map = {a.get("question_id"): a for a in answers}
        for sec in sections:
            for q in sec.get("questions", []):
                ans = answer_map.get(q.get("id"), {})
                if ans and not ans.get("is_correct", True):
                    error_summaries.append({
                        "id": q.get("id", 0),
                        "question": (q.get("content") or "")[:200],
                        "student_answer": ans.get("answer", ""),
                        "correct_answer": ans.get("correct_answer", ""),
                        "section": sec.get("section", "unknown"),
                    })

    # 从诊断中提取错题
    diag_result = await db.execute(
        select(DiagnosticSession)
        .where(DiagnosticSession.user_id == user_id, DiagnosticSession.status == "completed")
        .order_by(DiagnosticSession.completed_at.desc())
        .limit(3)
    )
    for diag in diag_result.scalars().all():
        questions = json.loads(diag.questions_json) if diag.questions_json else []
        answers = json.loads(diag.answers_json) if diag.answers_json else []
        for i, q in enumerate(questions):
            if i < len(answers) and not answers[i].get("is_correct", True):
                error_summaries.append({
                    "id": i,
                    "question": (q.get("question") or "")[:200],
                    "student_answer": answers[i].get("student_answer", ""),
                    "correct_answer": q.get("answer", ""),
                    "section": q.get("section", "unknown"),
                })

    if len(error_summaries) < 3:
        return []

    summary_text = json.dumps(error_summaries[:30], ensure_ascii=False)

    try:
        result = await chat_once_json(
            system_prompt=(
                "你是一个英语学习错误模式分析专家。分析学生的错题记录，找出深层错误模式（不是笼统的'语法弱'，"
                "而是具体的模式如'当句子含 since/for 时混淆现在完成时和一般过去时'）。\n"
                "返回 JSON：{\"genes\": [{\"pattern_key\": \"唯一标识（英文下划线格式）\", "
                "\"pattern_description\": \"中文描述（一句话精准描述错误模式）\", "
                "\"section\": \"题型\", \"example_ids\": [关联的错题id], "
                "\"severity\": \"high/medium/low\"}]}\n"
                "最多返回 8 个基因，按严重程度排序。"
            ),
            user_prompt=f"以下是学生最近的错题记录：\n{summary_text}",
        )
    except Exception:
        return []

    genes_data = result.get("genes", [])
    saved_genes = []

    for g in genes_data:
        pattern_key = g.get("pattern_key", "")[:100]
        if not pattern_key:
            continue

        # 检查是否已存在
        existing = await db.execute(
            select(ErrorGene).where(
                ErrorGene.user_id == user_id, ErrorGene.pattern_key == pattern_key
            )
        )
        gene = existing.scalar_one_or_none()

        if gene:
            # 更新已有基因
            gene.example_ids_json = json.dumps(g.get("example_ids", []))
            gene.updated_at = datetime.datetime.now(datetime.timezone.utc)
        else:
            gene = ErrorGene(
                user_id=user_id,
                pattern_key=pattern_key,
                pattern_description=g.get("pattern_description", ""),
                section=g.get("section", "unknown"),
                example_ids_json=json.dumps(g.get("example_ids", [])),
            )
            db.add(gene)

        await db.flush()
        saved_genes.append({
            "id": gene.id,
            "pattern_key": gene.pattern_key,
            "pattern_description": gene.pattern_description,
            "section": gene.section,
            "status": gene.status,
            "fix_attempts": gene.fix_attempts,
            "fix_correct": gene.fix_correct,
        })

    return saved_genes


async def get_error_genes(user_id: int, db: AsyncSession) -> list[dict]:
    """获取用户所有错误基因。"""
    result = await db.execute(
        select(ErrorGene)
        .where(ErrorGene.user_id == user_id)
        .order_by(ErrorGene.status.asc(), ErrorGene.updated_at.desc())
    )
    genes = result.scalars().all()
    return [
        {
            "id": g.id,
            "pattern_key": g.pattern_key,
            "pattern_description": g.pattern_description,
            "section": g.section,
            "status": g.status,
            "example_ids": json.loads(g.example_ids_json) if g.example_ids_json else [],
            "fix_attempts": g.fix_attempts,
            "fix_correct": g.fix_correct,
            "fix_exercises": json.loads(g.fix_exercises_json) if g.fix_exercises_json else None,
            "created_at": g.created_at.isoformat() if g.created_at else None,
        }
        for g in genes
    ]


async def generate_fix_drill(user_id: int, gene_id: int, db: AsyncSession) -> dict:
    """为某个错误基因生成修复练习。"""
    result = await db.execute(
        select(ErrorGene).where(ErrorGene.id == gene_id, ErrorGene.user_id == user_id)
    )
    gene = result.scalar_one_or_none()
    if not gene:
        return {"error": "gene not found"}

    try:
        exercises = await chat_once_json(
            system_prompt=(
                "你是一个英语练习题生成专家。根据学生的错误模式，生成针对性练习题来修复这个错误。\n"
                "返回 JSON：{\"exercises\": [{\"question\": \"题目内容\", \"options\": [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"], "
                "\"answer\": \"正确选项字母\", \"explanation\": \"解析（说明为什么这个选项正确，以及如何避免该错误模式）\"}]}\n"
                "生成 6 道题，难度递进，都针对同一个错误模式。"
            ),
            user_prompt=f"错误模式：{gene.pattern_description}\n题型：{gene.section}\n请生成修复练习。",
        )
    except Exception:
        return {"error": "生成练习失败，请稍后重试"}

    gene.fix_exercises_json = json.dumps(exercises.get("exercises", []), ensure_ascii=False)
    gene.status = "improving"
    await db.flush()

    return {
        "gene_id": gene.id,
        "pattern_description": gene.pattern_description,
        "exercises": exercises.get("exercises", []),
    }


async def submit_fix_answer(
    user_id: int, gene_id: int, exercise_index: int, answer: str, db: AsyncSession
) -> dict:
    """提交修复练习答案。"""
    result = await db.execute(
        select(ErrorGene).where(ErrorGene.id == gene_id, ErrorGene.user_id == user_id)
    )
    gene = result.scalar_one_or_none()
    if not gene or not gene.fix_exercises_json:
        return {"error": "gene or exercises not found"}

    exercises = json.loads(gene.fix_exercises_json)
    if exercise_index < 0 or exercise_index >= len(exercises):
        return {"error": "invalid exercise index"}

    ex = exercises[exercise_index]
    is_correct = answer.strip().upper() == ex.get("answer", "").strip().upper()

    gene.fix_attempts += 1
    if is_correct:
        gene.fix_correct += 1

    # 检查是否全部完成
    if gene.fix_attempts >= len(exercises):
        accuracy = gene.fix_correct / max(gene.fix_attempts, 1)
        if accuracy >= 0.8:
            gene.status = "fixed"
        elif accuracy >= 0.5:
            gene.status = "improving"
        else:
            gene.status = "active"

    await db.flush()

    return {
        "is_correct": is_correct,
        "correct_answer": ex.get("answer", ""),
        "explanation": ex.get("explanation", ""),
        "gene_status": gene.status,
        "fix_attempts": gene.fix_attempts,
        "fix_correct": gene.fix_correct,
        "total_exercises": len(exercises),
    }
