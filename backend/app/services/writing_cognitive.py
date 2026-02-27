"""写作认知增强服务 — 写作过程中实时引导，不告诉你写什么，而是提示怎么写得更好。

V3.3 功能：
- 实时句子分析：检测当前句子的表达质量，提示更地道的说法
- 句型建议：根据上下文推荐可用的句型
- 语音朗读自检：让用户"听到"自己写的英文是否通顺
"""

from app.services.llm import chat_once_json


_REALTIME_HINT_PROMPT = """你是一个英语写作认知增强助手。学生正在写英语作文，你需要对他刚写的内容提供实时引导。

重要原则：
- 不要替学生写！只提供提示和建议
- 不要给出完整的替代句子，只给方向性提示
- 用中文给建议，因为学生是中国学生
- 每次只给1-2条最重要的建议，不要信息过载

分析学生当前写的内容，返回 JSON：
{
    "sentence_quality": "good|ok|weak",
    "hints": [
        {
            "type": "expression|grammar|structure|vocabulary|coherence",
            "target_text": "学生原文中需要改进的部分（精确子串）",
            "hint": "提示信息（中文，不超过20字）",
            "direction": "改进方向（中文，不超过30字，不给出完整答案）"
        }
    ],
    "sentence_pattern_suggestion": "如果当前位置适合用某种句型，给出句型名称和简要说明（中文），否则为空字符串",
    "encouragement": "一句简短的鼓励或肯定（中文，不超过15字）"
}"""


_PARAGRAPH_REVIEW_PROMPT = """你是一个英语写作认知增强助手。学生刚写完一个段落，请对这个段落进行快速审视。

重要原则：
- 不要重写段落！只指出可以改进的方向
- 关注段落层面的问题：连贯性、逻辑、主题句
- 用中文给建议

返回 JSON：
{
    "coherence_score": 1-5,
    "has_topic_sentence": true/false,
    "flow_issues": ["连贯性问题1（如果有）"],
    "expression_highlights": [
        {"text": "学生写得好的表达（原文子串）", "praise": "好在哪里（中文简述）"}
    ],
    "improvement_directions": [
        {"aspect": "改进方面", "hint": "方向性提示（不给完整答案）"}
    ],
    "next_paragraph_hint": "下一段可以从什么角度展开（方向性提示）"
}"""


async def get_realtime_hint(
    current_text: str,
    full_content: str,
    prompt: str,
    grade: str = "",
) -> dict:
    """实时写作提示 — 分析学生当前写的句子，给出方向性引导。"""
    user_prompt = (
        f"【写作题目】{prompt}\n"
        f"【学生年级】{grade}\n"
        f"【已写全文】\n{full_content}\n\n"
        f"【刚写的内容（需要分析的部分）】\n{current_text}"
    )
    try:
        return await chat_once_json(_REALTIME_HINT_PROMPT, user_prompt)
    except Exception:
        return {
            "sentence_quality": "ok",
            "hints": [],
            "sentence_pattern_suggestion": "",
            "encouragement": "",
        }


async def review_paragraph(
    paragraph: str,
    full_content: str,
    prompt: str,
    paragraph_index: int = 0,
    grade: str = "",
) -> dict:
    """段落审视 — 学生写完一段后，快速给出段落层面的反馈。"""
    user_prompt = (
        f"【写作题目】{prompt}\n"
        f"【学生年级】{grade}\n"
        f"【已写全文】\n{full_content}\n\n"
        f"【当前段落（第{paragraph_index + 1}段）】\n{paragraph}"
    )
    try:
        return await chat_once_json(_PARAGRAPH_REVIEW_PROMPT, user_prompt)
    except Exception:
        return {
            "coherence_score": 3,
            "has_topic_sentence": True,
            "flow_issues": [],
            "expression_highlights": [],
            "improvement_directions": [],
            "next_paragraph_hint": "",
        }
