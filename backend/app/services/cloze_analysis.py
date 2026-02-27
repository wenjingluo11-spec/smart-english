"""完形填空认知增强服务 — AI 分析完形填空的语境线索和解题策略。

V3.2 功能：
- 空格前后语境高亮（上下文线索词标注）
- 每个空的"线索词"在文中的位置
- 学霸做完形的策略演示数据（先通读标记，再逐空分析）
"""

import json
import hashlib
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.reading_analysis import ReadingAnalysis
from app.services.llm import chat_once_json


_CLOZE_ANALYSIS_PROMPT = """你是一个英语完形填空认知增强专家。分析以下完形填空题，教学生"怎么做完形"。

对每个空格（按题号顺序），分析：
1. blank_index: 空格序号（从0开始）
2. context_clues: 该空的上下文线索词列表，每个标注：
   - text: 原文中的精确文本（线索词/短语）
   - position: "before"（空格前）或 "after"（空格后）
   - clue_type: 线索类型（collocation/logic/grammar/synonym/antonym/context）
   - hint: 为什么这个词是线索（中文简述）
3. blank_type: 该空考查的类型（vocabulary/grammar/logic/collocation/phrase）
4. strategy: 该空的解题策略（一句话，中文）

同时生成"学霸做完形"的整体策略：
- overview_strategy: 通读全文后的整体理解（2-3句话，中文）
- passage_keywords: 文章关键词列表（原文精确文本），帮助把握大意
- difficulty_blanks: 较难的空格序号列表（从0开始）
- solving_order: 建议做题顺序说明（先做哪些空，后做哪些空）

返回 JSON：
{
    "blanks": [
        {
            "blank_index": 0,
            "context_clues": [
                {"text": "原文线索词", "position": "before", "clue_type": "collocation", "hint": "线索说明"}
            ],
            "blank_type": "vocabulary",
            "strategy": "解题策略"
        }
    ],
    "overview_strategy": "通读全文后的整体理解",
    "passage_keywords": ["关键词1", "关键词2"],
    "difficulty_blanks": [2, 5],
    "solving_order": "建议做题顺序"
}"""


def _hash_cloze(passage: str, questions_text: str) -> str:
    raw = f"cloze|{passage}|{questions_text}"
    return hashlib.sha256(raw.encode()).hexdigest()


async def analyze_cloze(
    db: AsyncSession,
    passage_text: str,
    questions: list[dict],
) -> dict:
    """分析完形填空，返回认知增强数据。使用 reading_analyses 表缓存。"""

    questions_text = "\n".join(
        f"Q{i}: {q.get('content', '')} | 选项: {', '.join(q.get('options', []))}"
        for i, q in enumerate(questions)
    )
    cache_hash = _hash_cloze(passage_text, questions_text)

    # 查缓存 — 复用 reading_analyses 表，material_id 用 hash 的前8位整数
    cache_id = int(cache_hash[:8], 16) % 2147483647  # 避免溢出
    result = await db.execute(
        select(ReadingAnalysis).where(ReadingAnalysis.material_id == cache_id)
    )
    cached = result.scalar_one_or_none()

    if cached and cached.question_mapping_json:
        try:
            return json.loads(cached.question_mapping_json)
        except Exception:
            pass

    # 调用 LLM
    user_prompt = f"【完形填空原文】\n{passage_text}\n\n【题目列表】\n{questions_text}"
    try:
        analysis = await chat_once_json(_CLOZE_ANALYSIS_PROMPT, user_prompt)
    except Exception:
        return {
            "blanks": [],
            "overview_strategy": "",
            "passage_keywords": [],
            "difficulty_blanks": [],
            "solving_order": "",
        }

    # 标准化
    result_data = {
        "blanks": analysis.get("blanks", []),
        "overview_strategy": analysis.get("overview_strategy", ""),
        "passage_keywords": analysis.get("passage_keywords", []),
        "difficulty_blanks": analysis.get("difficulty_blanks", []),
        "solving_order": analysis.get("solving_order", ""),
    }

    # 存缓存
    record = ReadingAnalysis(
        material_id=cache_id,
        question_mapping_json=json.dumps(result_data, ensure_ascii=False),
        summary=result_data.get("overview_strategy", ""),
        structure_type="cloze",
    )
    db.add(record)
    try:
        await db.commit()
    except Exception:
        await db.rollback()

    return result_data
