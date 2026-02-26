"""AI剧情引擎服务 — LLM驱动的互动故事。"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.story import StoryTemplate, StorySession, StoryChapter
from app.services.llm import chat_once_json

CHAPTER_SYSTEM = """你是一位互动英语故事作家。根据故事设定和之前的剧情，生成下一章节。
要求：
1. 叙事文本用英文，约 150-250 词，适合学生的 CEFR 等级
2. 在叙事中自然融入 3-5 个值得学习的词汇/短语
3. 提供 2-3 个剧情选择
4. 设计一个英语挑战题（选择/填空/翻译）

返回 JSON：
{
  "narrative_text": "英文叙事文本...",
  "choices": [
    {"label": "A", "description": "选项描述（中英双语）", "next_prompt": "选择后的剧情走向提示"},
    {"label": "B", "description": "选项描述", "next_prompt": "剧情走向"}
  ],
  "challenge": {
    "type": "choice|fill|translate",
    "question": "题目",
    "options": ["A选项", "B选项", "C选项", "D选项"],
    "answer": "正确答案",
    "hint": "提示",
    "explanation": "解析"
  },
  "learning_points": [
    {"word": "词", "meaning": "释义", "usage": "用法说明"}
  ],
  "is_ending": false
}
如果故事应该结束，设 is_ending 为 true，不需要 choices。"""


async def start_story(template_id: int, user_id: int, db: AsyncSession) -> dict:
    """开始一个新故事。"""
    result = await db.execute(select(StoryTemplate).where(StoryTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        return {"error": "故事模板不存在"}

    session = StorySession(
        user_id=user_id,
        template_id=template_id,
        character_memory_json={"characters": [], "events": []},
        story_state_json={"mood": "neutral", "trust": 50},
    )
    db.add(session)
    await db.flush()

    # Generate first chapter
    user_prompt = f"故事标题：{template.title}\n类型：{template.genre}\n简介：{template.synopsis}\n\n{template.opening_prompt}\n\n请生成第 1 章。"
    chapter_data = await _generate_chapter(user_prompt, template.cefr_min)

    chapter = StoryChapter(
        session_id=session.id,
        chapter_number=1,
        narrative_text=chapter_data.get("narrative_text", ""),
        choices_json=chapter_data.get("choices"),
        challenge_json=chapter_data.get("challenge"),
        learning_points_json=chapter_data.get("learning_points"),
    )
    db.add(chapter)
    session.current_chapter = 1
    session.total_chapters = 1
    await db.flush()

    return _format_session(session, template, chapter)


async def make_choice(session_id: int, choice: str, user_id: int, db: AsyncSession) -> dict:
    """提交剧情选择，生成下一章。"""
    result = await db.execute(
        select(StorySession).where(StorySession.id == session_id, StorySession.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if not session or session.status != "active":
        return {"error": "故事不存在或已结束"}

    # Get current chapter
    result = await db.execute(
        select(StoryChapter)
        .where(StoryChapter.session_id == session_id, StoryChapter.chapter_number == session.current_chapter)
    )
    current = result.scalar_one_or_none()
    if not current:
        return {"error": "当前章节不存在"}

    current.chosen_option = choice

    # Find chosen option's next_prompt
    choices = current.choices_json or []
    next_prompt = ""
    for c in choices:
        if c.get("label") == choice:
            next_prompt = c.get("next_prompt", "")
            break

    # Get template for context
    result = await db.execute(select(StoryTemplate).where(StoryTemplate.id == session.template_id))
    template = result.scalar_one_or_none()

    # Build context from previous chapters
    result = await db.execute(
        select(StoryChapter).where(StoryChapter.session_id == session_id).order_by(StoryChapter.chapter_number)
    )
    prev_chapters = result.scalars().all()
    recap = "\n".join([f"第{ch.chapter_number}章: {ch.narrative_text[:100]}... (选择了{ch.chosen_option or '?'})" for ch in prev_chapters[-3:]])

    new_num = session.current_chapter + 1
    user_prompt = (
        f"故事：{template.title if template else ''}\n之前剧情摘要：\n{recap}\n\n"
        f"玩家选择了 {choice}：{next_prompt}\n\n请生成第 {new_num} 章。"
        + (" 如果故事已经发展到高潮，可以考虑结局。" if new_num >= 6 else "")
    )

    cefr = template.cefr_min if template else "A2"
    chapter_data = await _generate_chapter(user_prompt, cefr)

    chapter = StoryChapter(
        session_id=session_id,
        chapter_number=new_num,
        narrative_text=chapter_data.get("narrative_text", ""),
        choices_json=chapter_data.get("choices"),
        challenge_json=chapter_data.get("challenge"),
        learning_points_json=chapter_data.get("learning_points"),
    )
    db.add(chapter)
    session.current_chapter = new_num
    session.total_chapters = new_num

    if chapter_data.get("is_ending"):
        session.status = "completed"

    await db.flush()
    return _format_session(session, template, chapter)


async def submit_challenge(session_id: int, chapter_id: int, answer: str, user_id: int, db: AsyncSession) -> dict:
    """提交章节英语挑战答案。"""
    result = await db.execute(
        select(StoryChapter).where(StoryChapter.id == chapter_id, StoryChapter.session_id == session_id)
    )
    chapter = result.scalar_one_or_none()
    if not chapter or not chapter.challenge_json:
        return {"error": "挑战不存在"}

    challenge = chapter.challenge_json
    correct = challenge.get("answer", "")
    is_correct = answer.strip().lower() == correct.strip().lower()

    return {
        "is_correct": is_correct,
        "correct_answer": correct,
        "explanation": challenge.get("explanation", ""),
    }


async def _generate_chapter(user_prompt: str, cefr: str) -> dict:
    system = CHAPTER_SYSTEM + f"\n\n目标 CEFR 等级：{cefr}"
    try:
        return await chat_once_json(system, user_prompt)
    except Exception:
        return {
            "narrative_text": "The story continues... (AI generation temporarily unavailable)",
            "choices": [{"label": "A", "description": "Continue", "next_prompt": "continue the story"}],
            "challenge": None,
            "learning_points": [],
            "is_ending": False,
        }


def _format_session(session, template, chapter) -> dict:
    return {
        "session": {
            "id": session.id,
            "template_id": session.template_id,
            "template_title": template.title if template else "",
            "current_chapter": session.current_chapter,
            "total_chapters": session.total_chapters,
            "status": session.status,
            "started_at": session.started_at.isoformat() if session.started_at else "",
        },
        "chapter": {
            "id": chapter.id,
            "chapter_number": chapter.chapter_number,
            "narrative_text": chapter.narrative_text,
            "choices": chapter.choices_json,
            "challenge": chapter.challenge_json,
            "chosen_option": chapter.chosen_option,
            "learning_points": chapter.learning_points_json,
        },
    }
