"""截图学英语服务 — 调用 Claude Vision 分析截图，生成练习。"""

import base64
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.screenshot import ScreenshotLesson
from app.services.llm import chat_once_vision, chat_once_json

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"

ANALYSIS_SYSTEM = """你是一位英语学习助手。用户会上传一张截图（可能来自游戏、社交媒体、网页等）。
请分析截图中的英文内容，返回 JSON：
{
  "extracted_text": "截图中提取的英文文本",
  "vocabulary": [{"word": "词", "pos": "词性", "meaning": "中文释义", "example": "例句"}],
  "grammar_points": [{"point": "语法点", "explanation": "解释", "example": "例句"}],
  "cultural_notes": [{"note": "文化注释"}],
  "exercises": [
    {"type": "choice", "question": "题目", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "解析"},
    {"type": "fill", "question": "填空题 ___", "answer": "答案", "explanation": "解析"}
  ]
}
请根据截图内容生成 3-5 个词汇、1-2 个语法点、1-2 个文化注释、3 道练习题。"""

ANALYSIS_USER = "请分析这张截图中的英文内容，提取词汇、语法点和文化注释，并生成练习题。来源类型：{source_type}"


async def analyze_screenshot(
    image_url: str, source_type: str, user_id: int, db: AsyncSession
) -> ScreenshotLesson:
    """分析截图并保存结果。"""
    # 读取图片并转 base64
    filepath = UPLOAD_DIR / image_url.split("/")[-1]
    image_data = filepath.read_bytes()
    image_b64 = base64.b64encode(image_data).decode()

    ext = filepath.suffix.lower()
    media_type = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp", "gif": "image/gif"}.get(ext.lstrip("."), "image/png")

    # 调用 Claude Vision
    raw = await chat_once_vision(image_b64, ANALYSIS_SYSTEM, ANALYSIS_USER.format(source_type=source_type), media_type)

    # 解析 JSON
    import json
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    analysis = json.loads(cleaned)

    lesson = ScreenshotLesson(
        user_id=user_id,
        image_url=image_url,
        source_type=source_type,
        extracted_text=analysis.get("extracted_text", ""),
        analysis_json=analysis,
    )
    db.add(lesson)
    await db.flush()
    return lesson


async def check_exercise(lesson: ScreenshotLesson, exercise_index: int, answer: str) -> dict:
    """检查截图练习答案。"""
    exercises = (lesson.analysis_json or {}).get("exercises", [])
    if exercise_index < 0 or exercise_index >= len(exercises):
        return {"is_correct": False, "correct_answer": "", "explanation": "练习不存在"}

    ex = exercises[exercise_index]
    correct = ex.get("answer", "")
    is_correct = answer.strip().lower() == correct.strip().lower()
    return {
        "is_correct": is_correct,
        "correct_answer": correct,
        "explanation": ex.get("explanation", ""),
    }
