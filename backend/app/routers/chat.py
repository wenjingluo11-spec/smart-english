from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from sse_starlette.sse import EventSourceResponse
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.chat import ChatRequest, CognitiveDemoRequest
from app.services.llm import chat_stream
from app.services.cognitive_demo import run_cognitive_demo
from app.services.cognitive_orchestrator import (
    decide_guidance,
    get_or_create_session,
    log_user_turn,
    log_assistant_turn,
    log_reflection,
    log_tqi_metric,
)

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


@router.post("/cognitive-demo")
async def cognitive_demo(
    req: CognitiveDemoRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """返回本地可运行的认知增强演示结果，不依赖外部大模型。"""
    result = await run_cognitive_demo(user=user, req=req, db=db)
    await db.commit()
    return result


@router.post("/send")
async def send_message(
    req: ChatRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tutor 正常聊天入口，保留流式大模型问答链路。"""
    mode = getattr(req, "mode", None) or "free"
    guidance_level = (getattr(req, "guidance_level", None) or "socratic").lower()
    if guidance_level not in {"socratic", "mirror", "hybrid"}:
        guidance_level = "socratic"
    hint_budget = max(0, min(int(getattr(req, "hint_budget", 2) or 2), 5))
    reflection_text = (getattr(req, "reflection_text", None) or "").strip()

    decision = decide_guidance(
        user_message=req.message,
        reflection_text=reflection_text,
        guidance_level=guidance_level,
        hint_budget=hint_budget,
        allow_direct_answer=bool(getattr(req, "allow_direct_answer", False)),
    )

    # 重要操作：先把用户输入与反思轨迹写入认知日志，便于后续统计认知增益。
    session = await get_or_create_session(
        user_id=user.id,
        db=db,
        module="chat",
        guidance_mode=guidance_level,
        session_id=getattr(req, "session_id", None),
    )

    # 先落用户输入与反思轨迹
    user_turn = await log_user_turn(
        session_id=session.id,
        content=req.message,
        stage=decision.stage,
        db=db,
        turn_index=len(req.history) + 1,
        mirror_level=decision.mirror_level,
        zpd_band=decision.zpd_band,
        hint_used=hint_budget <= 0,
    )
    await log_reflection(
        user_id=user.id,
        session_id=session.id,
        reflection_text=reflection_text,
        quality_score=decision.tqi_score,
        turn_id=user_turn.id,
        db=db,
    )
    await log_tqi_metric(
        user_id=user.id,
        session_id=session.id,
        tqi_score=decision.tqi_score,
        mirror_level=decision.mirror_level,
        details_json={
            "module": "chat",
            "stage": decision.stage,
            "zpd_band": decision.zpd_band,
            "guidance_level": guidance_level,
            "should_divert": decision.should_divert,
        },
        db=db,
    )

    if decision.should_divert and decision.diversion_message:
        await log_assistant_turn(
            session_id=session.id,
            content=decision.diversion_message,
            stage="query",
            db=db,
            turn_index=len(req.history) + 2,
            mirror_level=decision.mirror_level,
            zpd_band=decision.zpd_band,
        )
        await db.commit()

        async def divert_generator():
            if await request.is_disconnected():
                return
            yield {"data": decision.diversion_message}

        return EventSourceResponse(divert_generator())

    template = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["free"])
    system = template.format(grade=user.grade, cefr_level=user.cefr_level)
    system = f"{system}\n\n{decision.prompt_suffix}"
    messages = [{"role": m.role, "content": m.content} for m in req.history]
    messages.append({"role": "user", "content": req.message})

    async def event_generator():
        assistant_parts: list[str] = []
        try:
            async for chunk in chat_stream(messages, system_prompt=system):
                if await request.is_disconnected():
                    break
                assistant_parts.append(chunk)
                yield {"data": chunk}
        finally:
            full_text = "".join(assistant_parts).strip()
            if full_text:
                # 重要操作：将完整回复落库，保证会话和认知轨迹闭环。
                await log_assistant_turn(
                    session_id=session.id,
                    content=full_text,
                    stage="refine",
                    db=db,
                    turn_index=len(req.history) + 2,
                    mirror_level=decision.mirror_level,
                    zpd_band=decision.zpd_band,
                )
            await db.commit()

    return EventSourceResponse(event_generator())
