"""LLM 调用封装 — 使用 Gemini API (OpenAI 兼容接口)，支持流式输出。"""

from collections.abc import AsyncIterator
import httpx
from app.config import settings

API_URL = "https://generativelanguage.googleapis.com/v1beta/openai"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.gemini_api_key}",
        "Content-Type": "application/json",
    }


def _to_openai_messages(messages: list[dict], system_prompt: str = "") -> list[dict]:
    """将内部消息格式转为 OpenAI 兼容格式，system prompt 作为首条 system 消息。"""
    out = []
    if system_prompt:
        out.append({"role": "system", "content": system_prompt})
    for m in messages:
        out.append({"role": m.get("role", "user"), "content": m.get("content", "")})
    return out


async def chat_stream(
    messages: list[dict], system_prompt: str = ""
) -> AsyncIterator[str]:
    """流式调用 Gemini API，逐块 yield 文本。"""
    body = {
        "model": settings.gemini_model,
        "max_tokens": 2048,
        "stream": True,
        "messages": _to_openai_messages(messages, system_prompt),
    }

    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", f"{API_URL}/chat/completions", headers=_headers(), json=body) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = line[6:]
                if data.strip() == "[DONE]":
                    break
                import json
                event = json.loads(data)
                choices = event.get("choices", [])
                if choices:
                    delta = choices[0].get("delta", {})
                    text = delta.get("content", "")
                    if text:
                        yield text


async def chat_once(messages: list[dict], system_prompt: str = "") -> str:
    """非流式调用 Gemini API，返回完整文本。"""
    body = {
        "model": settings.gemini_model,
        "max_tokens": 2048,
        "messages": _to_openai_messages(messages, system_prompt),
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(f"{API_URL}/chat/completions", headers=_headers(), json=body)
        resp.raise_for_status()
        result = resp.json()
        return result["choices"][0]["message"]["content"]


async def chat_once_vision(image_base64: str, system_prompt: str, user_prompt: str, media_type: str = "image/png") -> str:
    """多模态调用 Gemini API（图片+文本），返回完整文本。"""
    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{image_base64}"}},
                {"type": "text", "text": user_prompt},
            ],
        },
    ]
    body = {"model": settings.gemini_model, "max_tokens": 4096, "messages": messages}

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(f"{API_URL}/chat/completions", headers=_headers(), json=body)
        resp.raise_for_status()
        result = resp.json()
        return result["choices"][0]["message"]["content"]


async def chat_once_json(system_prompt: str, user_prompt: str) -> dict:
    """调用 Gemini API 并解析 JSON 响应。"""
    import json as _json
    full_system = system_prompt + "\n\n你必须返回且仅返回一个合法的 JSON 对象，不要包含 markdown 代码块标记。"
    text = await chat_once([{"role": "user", "content": user_prompt}], full_system)
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    return _json.loads(cleaned)


async def judge_answer(question_content: str, reference_answer: str, student_answer: str) -> dict:
    """用 LLM 判断学生答案是否正确 — 认知增强模式。

    返回不仅包含对错判定，还包含"学霸怎么看出来的"审题思路。
    """
    system_prompt = (
        "你是一个英语认知增强助手。判断学生答案后，重点告诉学生「学霸是怎么看出来的」。\n"
        "不要只说「答案是B因为...」，而要说「注意到题干中的xxx信号词，学霸会先看xxx，然后...」\n"
        "对于选择题，比较选项字母即可；对于填空题，允许大小写和空格差异；对于主观题，根据语义判断。\n\n"
        "核心原则：认知增强，不是认知卸载。不要直接给解题思路，而是引导学生自己发现。\n"
        "当学生答错时，提供3级渐进式提示（hint_levels），从模糊到具体，让学生主动思考：\n"
        "- Level 1：方向性提示（比如'注意看第三段的转折词'）\n"
        "- Level 2：缩小范围（比如'but后面的那句话和选项B有什么关系？'）\n"
        "- Level 3：接近答案（比如'作者用but转折，说明态度和前文相反，哪个选项表达了相反的态度？'）\n\n"
        "你必须返回且仅返回一个 JSON 对象，格式如下（不要包含 markdown 代码块标记）：\n"
        "{\n"
        '  "is_correct": true/false,\n'
        '  "correct_answer": "简短正确答案",\n'
        '  "explanation": "传统解释（保留兼容）",\n'
        '  "how_to_spot": "学霸是怎么看出来的——用一两句话描述审题思路",\n'
        '  "key_clues": [\n'
        '    {"text": "题目中的原文关键词/短语", "role": "这个线索的作用"}\n'
        "  ],\n"
        '  "common_trap": "这道题常见的陷阱是什么",\n'
        '  "method": "解题方法论名称+简述",\n'
        '  "hint_levels": [\n'
        '    "Level1: 方向性提示，不暴露答案，引导学生往正确方向看",\n'
        '    "Level2: 缩小范围，指向具体的句子或词，但仍需学生自己判断",\n'
        '    "Level3: 接近答案，几乎点明，但仍以提问方式引导学生得出结论"\n'
        "  ],\n"
        '  "guided_discovery": "用提问方式引导学生自己推导出答案，比如：你注意到xxx了吗？如果xxx，那说明什么？"\n'
        "}"
    )
    messages = [
        {
            "role": "user",
            "content": (
                f"【题目】\n{question_content}\n\n"
                f"【参考解析】\n{reference_answer}\n\n"
                f"【学生答案】\n{student_answer}\n\n"
                "请判断学生答案是否正确，并用认知增强模式返回 JSON。"
            ),
        }
    ]
    try:
        text = await chat_once(messages, system_prompt)
        import json as _json
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        result = _json.loads(cleaned)
        return {
            "is_correct": bool(result.get("is_correct", False)),
            "correct_answer": str(result.get("correct_answer", "")),
            "explanation": str(result.get("explanation", "")),
            # 认知增强新字段
            "how_to_spot": str(result.get("how_to_spot", "")),
            "key_clues": result.get("key_clues", []),
            "common_trap": str(result.get("common_trap", "")),
            "method": str(result.get("method", "")),
            # V3: 引导发现模式
            "hint_levels": result.get("hint_levels", []),
            "guided_discovery": str(result.get("guided_discovery", "")),
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("judge_answer failed: %s", e)
        return {
            "is_correct": False,
            "correct_answer": "",
            "explanation": "判题服务暂时不可用，请稍后重试",
            "how_to_spot": "",
            "key_clues": [],
            "common_trap": "",
            "method": "",
            "hint_levels": [],
            "guided_discovery": "",
        }
