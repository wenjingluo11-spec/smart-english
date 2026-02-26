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
    """用 LLM 判断学生答案是否正确。"""
    system_prompt = (
        "你是一个英语题目判题助手。根据题目内容和参考解析，判断学生的答案是否正确。\n"
        "对于选择题，比较选项字母即可；对于填空题，允许大小写和空格差异；对于主观题，根据语义判断。\n"
        "你必须返回且仅返回一个 JSON 对象，格式如下（不要包含 markdown 代码块标记）：\n"
        '{"is_correct": true/false, "correct_answer": "简短正确答案", "explanation": "判分说明"}'
    )
    messages = [
        {
            "role": "user",
            "content": (
                f"【题目】\n{question_content}\n\n"
                f"【参考解析】\n{reference_answer}\n\n"
                f"【学生答案】\n{student_answer}\n\n"
                "请判断学生答案是否正确，返回 JSON。"
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
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("judge_answer failed: %s", e)
        return {
            "is_correct": False,
            "correct_answer": "",
            "explanation": "判题服务暂时不可用，请稍后重试",
        }
