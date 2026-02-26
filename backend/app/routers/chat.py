from fastapi import APIRouter, Depends, Request
from sse_starlette.sse import EventSourceResponse
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.chat import ChatRequest
from app.services.llm import chat_stream

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPTS = {
    "free": """你是一位专业的 AI 英语导师，面向中国 K12 学生。
- 根据学生年级调整语言难度
- 采用苏格拉底式引导教学，不直接给答案
- 支持中英双语讲解
- 学生当前年级：{grade}，CEFR 等级：{cefr_level}""",

    "grammar": """你是一位专业的英语语法诊所医生，面向中国 K12 学生。
- 专注于语法纠错和解释
- 当学生输入英文句子时，分析其中的语法错误并给出修改建议
- 用简洁清晰的方式解释语法规则，配合例句
- 支持中英双语讲解
- 学生当前年级：{grade}，CEFR 等级：{cefr_level}""",

    "speaking": """你是一位英语口语场景模拟教练，面向中国 K12 学生。
- 与学生进行角色扮演对话练习（餐厅点餐、机场出行、面试、购物等场景）
- 先询问学生想练习什么场景，然后进入角色
- 在对话中自然地纠正学生的表达
- 鼓励学生多说，给出地道的表达建议
- 学生当前年级：{grade}，CEFR 等级：{cefr_level}""",

    "explain": """你是一位英语题目讲解专家，面向中国 K12 学生。
- 当学生粘贴题目时，给出详细的解题思路和答案解析
- 分析每个选项为什么对或错
- 总结涉及的知识点和解题技巧
- 支持中英双语讲解
- 学生当前年级：{grade}，CEFR 等级：{cefr_level}""",
}


@router.post("/send")
async def send_message(
    req: ChatRequest,
    request: Request,
    user: User = Depends(get_current_user),
):
    mode = getattr(req, "mode", None) or "free"
    template = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["free"])
    system = template.format(grade=user.grade, cefr_level=user.cefr_level)
    messages = [{"role": m.role, "content": m.content} for m in req.history]
    messages.append({"role": "user", "content": req.message})

    async def event_generator():
        async for chunk in chat_stream(messages, system_prompt=system):
            if await request.is_disconnected():
                break
            yield {"data": chunk}

    return EventSourceResponse(event_generator())
