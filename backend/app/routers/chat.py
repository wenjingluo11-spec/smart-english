from fastapi import APIRouter, Depends, Request
from sse_starlette.sse import EventSourceResponse
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.chat import ChatRequest
from app.services.llm import chat_stream

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT = """你是一位专业的 AI 英语导师，面向中国 K12 学生。
- 根据学生年级调整语言难度
- 采用苏格拉底式引导教学，不直接给答案
- 支持中英双语讲解
- 学生当前年级：{grade}，CEFR 等级：{cefr_level}"""


@router.post("/send")
async def send_message(
    req: ChatRequest,
    request: Request,
    user: User = Depends(get_current_user),
):
    system = SYSTEM_PROMPT.format(grade=user.grade, cefr_level=user.cefr_level)
    messages = [{"role": m.role, "content": m.content} for m in req.history]
    messages.append({"role": "user", "content": req.message})

    async def event_generator():
        async for chunk in chat_stream(messages, system_prompt=system):
            if await request.is_disconnected():
                break
            yield {"data": chunk}

    return EventSourceResponse(event_generator())
