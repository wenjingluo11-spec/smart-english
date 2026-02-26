"""AI 出题官服务 — 学生自定义 LLM 出题。"""

import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.exam import CustomQuizSession, ExamProfile
from app.services.llm import chat_once_json


SECTION_NAMES = {
    "reading": "阅读理解", "cloze": "完形填空", "grammar_fill": "语法填空",
    "error_correction": "短文改错", "writing": "书面表达", "mixed": "综合",
}


async def generate_custom_quiz(user_id: int, user_prompt: str, db: AsyncSession) -> dict:
    """根据用户描述生成自定义题目。"""
    profile_result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    exam_type = profile.exam_type if profile else "zhongkao"
    exam_label = "高考" if exam_type == "gaokao" else "中考"

    try:
        result = await chat_once_json(
            system_prompt=(
                f"你是一个{exam_label}英语出题专家。根据学生的要求生成练习题，质量对标真题。\n"
                "返回 JSON：{\"section\": \"题型（reading/cloze/grammar_fill/error_correction/writing/mixed）\", "
                "\"difficulty\": 1-5的难度, \"questions\": ["
                "{\"question\": \"题目内容（如果是阅读理解，包含文章）\", "
                "\"options\": [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"], "
                "\"answer\": \"正确答案\", \"explanation\": \"解析\"}]}\n"
                f"考试类型：{exam_label}，请确保题目格式和难度符合{exam_label}标准。\n"
                "如果学生没有指定题数，默认生成 5 道题。"
            ),
            user_prompt=user_prompt,
        )
    except Exception:
        return {"error": "题目生成失败，请稍后重试"}

    questions = result.get("questions", [])
    section = result.get("section", "mixed")
    difficulty = result.get("difficulty", 3)

    session = CustomQuizSession(
        user_id=user_id,
        exam_type=exam_type,
        user_prompt=user_prompt,
        section=section,
        difficulty=difficulty,
        generated_questions_json=json.dumps(questions, ensure_ascii=False),
        total_questions=len(questions),
    )
    db.add(session)
    await db.flush()

    return {
        "session_id": session.id,
        "section": section,
        "section_label": SECTION_NAMES.get(section, section),
        "difficulty": difficulty,
        "questions": questions,
        "total": len(questions),
    }


async def submit_custom_quiz(
    user_id: int, session_id: int, answers: list[dict], db: AsyncSession
) -> dict:
    """提交自定义题目答案并批改。"""
    result = await db.execute(
        select(CustomQuizSession).where(
            CustomQuizSession.id == session_id, CustomQuizSession.user_id == user_id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        return {"error": "session not found"}

    questions = json.loads(session.generated_questions_json or "[]")
    correct_count = 0
    feedback = []

    for i, q in enumerate(questions):
        student_answer = ""
        for a in answers:
            if a.get("index") == i:
                student_answer = a.get("answer", "")
                break

        is_correct = student_answer.strip().upper() == q.get("answer", "").strip().upper()
        if is_correct:
            correct_count += 1

        feedback.append({
            "index": i,
            "is_correct": is_correct,
            "student_answer": student_answer,
            "correct_answer": q.get("answer", ""),
            "explanation": q.get("explanation", ""),
        })

    session.answers_json = json.dumps(answers, ensure_ascii=False)
    session.score = correct_count
    session.feedback_json = json.dumps(feedback, ensure_ascii=False)
    session.status = "completed"
    await db.flush()

    accuracy = round(correct_count / max(len(questions), 1) * 100, 1)

    return {
        "session_id": session.id,
        "score": correct_count,
        "total": len(questions),
        "accuracy": accuracy,
        "feedback": feedback,
    }


async def get_custom_history(user_id: int, db: AsyncSession) -> list[dict]:
    """获取自定义出题历史。"""
    result = await db.execute(
        select(CustomQuizSession)
        .where(CustomQuizSession.user_id == user_id)
        .order_by(CustomQuizSession.created_at.desc())
        .limit(20)
    )
    return [
        {
            "id": s.id,
            "user_prompt": s.user_prompt,
            "section": s.section,
            "difficulty": s.difficulty,
            "score": s.score,
            "total_questions": s.total_questions,
            "status": s.status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in result.scalars().all()
    ]
