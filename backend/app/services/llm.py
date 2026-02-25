"""LLM 调用封装 — 使用 httpx 直接调 Claude API，支持流式输出。"""

from collections.abc import AsyncIterator
import httpx
from app.config import settings

API_URL = "https://api.anthropic.com/v1/messages"


async def chat_stream(
    messages: list[dict], system_prompt: str = ""
) -> AsyncIterator[str]:
    """流式调用 Claude API，逐块 yield 文本。"""
    headers = {
        "x-api-key": settings.claude_api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body: dict = {
        "model": settings.claude_model,
        "max_tokens": 2048,
        "stream": True,
        "messages": messages,
    }
    if system_prompt:
        body["system"] = system_prompt

    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", API_URL, headers=headers, json=body) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = line[6:]
                if data == "[DONE]":
                    break
                import json

                event = json.loads(data)
                if event.get("type") == "content_block_delta":
                    text = event["delta"].get("text", "")
                    if text:
                        yield text


async def chat_once(messages: list[dict], system_prompt: str = "") -> str:
    """非流式调用 Claude API，返回完整文本。"""
    headers = {
        "x-api-key": settings.claude_api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body: dict = {
        "model": settings.claude_model,
        "max_tokens": 2048,
        "messages": messages,
    }
    if system_prompt:
        body["system"] = system_prompt

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(API_URL, headers=headers, json=body)
        resp.raise_for_status()
        result = resp.json()
        return result["content"][0]["text"]
