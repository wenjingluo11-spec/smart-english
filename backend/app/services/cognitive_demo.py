"""本地可运行的认知增强 Demo 服务。"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cognitive import CognitiveGainSnapshot
from app.models.user import User
from app.schemas.chat import CognitiveDemoRequest
from app.services.cognitive_orchestrator import (
    decide_guidance,
    get_or_create_session,
    log_assistant_turn,
    log_reflection,
    log_tqi_metric,
    log_user_turn,
    to_mirror_level,
)


def _detect_focus_area(prompt: str, mode: str) -> str:
    """根据题目内容估算当前回合的认知焦点。"""
    text = f"{mode} {prompt}".lower()
    if any(token in text for token in ["tense", "时态", "grammar", "语法"]):
        return "语法判断"
    if any(token in text for token in ["reading", "阅读", "主旨", "细节"]):
        return "阅读证据定位"
    if any(token in text for token in ["writing", "作文", "论点", "写作"]):
        return "写作论证"
    if any(token in text for token in ["speaking", "口语", "表达"]):
        return "口语表达"
    return "英语推理"


def _detect_strengths(reflection_text: str, tqi_before: float) -> list[str]:
    """从用户草稿里提取已经具备的元认知优势。"""
    strengths: list[str] = []
    text = reflection_text.strip()
    if text:
        strengths.append("你已经先暴露了自己的思路，而不是把求解过程直接外包。")
    if any(marker in text for marker in ["因为", "所以", "but", "because", "therefore"]):
        strengths.append("你开始使用因果连接词，说明你在尝试建立推理链。")
    if any(marker in text for marker in ["我不确定", "可能", "I think", "not sure", "maybe"]):
        strengths.append("你能标记不确定点，这属于有效的元认知监控。")
    if tqi_before >= 0.65:
        strengths.append("当前草稿已经接近可检验假设，而不是零散直觉。")
    return strengths or ["你愿意进入反思流程，这本身就是认知增强的起点。"]


def _detect_blind_spots(prompt: str, reflection_text: str, diverted: bool, tqi_before: float) -> list[str]:
    """找出当前草稿的关键盲点，供前端做镜像反馈。"""
    blind_spots: list[str] = []
    if diverted:
        blind_spots.append("你有明显的直接要答案倾向，存在认知卸载风险。")
    if not reflection_text.strip():
        blind_spots.append("你还没有提供可审计的思路，系统无法判断你卡在概念还是证据。")
    if tqi_before < 0.45:
        blind_spots.append("当前表达更像结论感受，而不是可验证的推理过程。")
    lowered = prompt.lower()
    if "why" in lowered or "为什么" in prompt:
        blind_spots.append("你在问“为什么”，但草稿里还没明确指出支撑这个 why 的证据。")
    return blind_spots or ["你已经有基础思路，下一步需要把它结构化。"]


def _missing_evidence(prompt: str, focus_area: str) -> list[str]:
    """根据任务类型生成还缺失的证据清单。"""
    if focus_area == "语法判断":
        return [
            "题干中真正触发语法规则的时间标记或结构信号。",
            "为什么其他相近规则不成立的反证。",
        ]
    if focus_area == "阅读证据定位":
        return [
            "能直接支撑答案的原文句子或关键词。",
            "排除干扰项时的反向证据。",
        ]
    if focus_area == "写作论证":
        return [
            "论点与例子之间的因果桥接句。",
            "是否存在反方视角以及你的回应。",
        ]
    if focus_area == "口语表达":
        return [
            "场景目标和你想传达的核心意图。",
            "更自然表达和直译表达之间的差异点。",
        ]
    return [
        "你判断所依赖的证据来源。",
        "一个可以推翻你当前想法的反例。",
    ]


def _build_socratic_questions(
    prompt: str,
    reflection_text: str,
    focus_area: str,
    zpd_band: str,
) -> list[str]:
    """生成苏格拉底式追问，逼用户把直觉转成可验证推理。"""
    questions = [
        "如果你暂时不能看答案，你会先检查哪一个最小证据点？",
        "哪一步是你现在最不确定的？它是概念不清、证据不足，还是比较规则时卡住了？",
        "如果你的当前判断是错的，最可能错在哪个前提？",
    ]

    if focus_area == "语法判断":
        questions[0] = "先不要选答案。题干里哪一个时间标记或句法结构最值得你先圈出来？"
    elif focus_area == "阅读证据定位":
        questions[0] = "先不要看解析。原文中哪一句最可能直接支撑你的判断？"
    elif focus_area == "写作论证":
        questions[0] = "如果要让论点更站得住，你最先补哪一条证据或例子？"
    elif focus_area == "口语表达":
        questions[0] = "在这个场景里，你真正想完成的沟通目标是什么？"

    if zpd_band == "hard":
        questions[2] = "把任务再切小一点：只验证一个前提时，你会先验证哪一个？"
    elif zpd_band == "easy":
        questions[2] = "除了证明自己是对的，你还能给出一个反例来压力测试当前判断吗？"

    if not reflection_text.strip():
        questions[1] = "先用一句话写下你的第一反应判断，再告诉我你最没把握的词或规则。"

    return questions


def _build_refined_thought(prompt: str, reflection_text: str, focus_area: str) -> str:
    """把用户原始思路整理成更容易审计的结构化草稿。"""
    idea = reflection_text.strip() or "我还没有形成稳定判断。"
    return (
        f"1. 当前任务焦点：{focus_area}。\n"
        f"2. 我的初步判断：{idea}\n"
        "3. 我需要补的证据：先圈出题干或材料里真正触发判断的关键词。\n"
        "4. 我的验证动作：先验证一个前提，再排除一个最像正确答案的干扰项。"
    )


def _build_delta_tags(tqi_before: float, diverted: bool, reflection_text: str) -> list[str]:
    """总结这轮认知增强相对于原始输入新增了哪些结构。"""
    tags: list[str] = []
    if diverted:
        tags.append("从直接索答切回先思考")
    if not reflection_text.strip():
        tags.append("从空白输入切到可审计草稿")
    if tqi_before < 0.5:
        tags.append("把直觉判断升级成可检验假设")
    tags.append("补出证据链")
    tags.append("加入反证检查")
    return tags


def _estimate_offload_risk(tqi_before: float, diverted: bool, reflection_text: str) -> tuple[float, float]:
    """估算认知卸载风险在引导前后的变化。"""
    before = 0.35 + (0.35 if diverted else 0.0) + max(0.0, 0.35 - tqi_before)
    if len(reflection_text.strip()) >= 40:
        before -= 0.10
    before = max(0.05, min(before, 0.95))
    after = max(0.05, round(before - (0.22 if reflection_text.strip() else 0.12), 3))
    return round(before, 3), round(after, 3)


def _estimate_tqi_after(tqi_before: float, reflection_text: str, zpd_band: str) -> float:
    """基于草稿质量和支架强度，投影引导后的 TQI。"""
    gain = 0.16
    if reflection_text.strip():
        gain += 0.10
    if len(reflection_text.strip()) >= 80:
        gain += 0.04
    if zpd_band == "sweet":
        gain += 0.03
    return round(min(0.96, tqi_before + gain), 3)


def _build_coach_response(
    focus_area: str,
    mirror_level: str,
    zpd_band: str,
    cognitive_gain: float,
    questions: list[str],
) -> str:
    """生成可直接展示给用户的教练式反馈文案。"""
    return (
        f"**认知之镜反馈**\n"
        f"当前焦点：{focus_area}\n"
        f"镜像层级：`{mirror_level}`\n"
        f"ZPD 区间：`{zpd_band}`\n"
        f"本轮预估认知增益：`+{int(cognitive_gain * 100)}%`\n\n"
        "先不要要答案，先完成这 3 个动作：\n"
        f"1. {questions[0]}\n"
        f"2. {questions[1]}\n"
        f"3. {questions[2]}"
    )


async def run_cognitive_demo(
    user: User,
    req: CognitiveDemoRequest,
    db: AsyncSession,
) -> dict:
    """运行本地认知增强 demo，并把关键指标写入认知数据表。"""
    reflection_text = (req.reflection_text or "").strip()
    guidance_level = (req.guidance_level or "mirror").lower()
    if guidance_level not in {"socratic", "mirror", "hybrid"}:
        guidance_level = "mirror"

    decision = decide_guidance(
        user_message=req.prompt,
        reflection_text=reflection_text,
        guidance_level=guidance_level,
        hint_budget=max(0, min(req.hint_budget, 5)),
        allow_direct_answer=False,
    )

    mirror_level = decision.mirror_level or to_mirror_level(decision.tqi_score)
    focus_area = _detect_focus_area(req.prompt, req.mode)
    tqi_before = decision.tqi_score
    tqi_after = _estimate_tqi_after(tqi_before, reflection_text, decision.zpd_band)
    cognitive_gain = round(tqi_after - tqi_before, 3)
    offload_risk_before, offload_risk_after = _estimate_offload_risk(
        tqi_before,
        decision.should_divert,
        reflection_text,
    )
    questions = _build_socratic_questions(
        req.prompt,
        reflection_text,
        focus_area,
        decision.zpd_band,
    )
    refined_thought = _build_refined_thought(req.prompt, reflection_text, focus_area)
    coach_response = _build_coach_response(
        focus_area,
        mirror_level,
        decision.zpd_band,
        cognitive_gain,
        questions,
    )

    # 重要操作：为 demo 也创建完整 session，后续统计报表可直接复用。
    session = await get_or_create_session(
        user_id=user.id,
        db=db,
        module="chat",
        guidance_mode=guidance_level,
    )
    session.context_json = {
        "demo": True,
        "mode": req.mode,
        "focus_area": focus_area,
    }

    # 重要操作：先记录用户原始输入与反思质量，形成“增强前”快照。
    user_turn = await log_user_turn(
        session_id=session.id,
        content=req.prompt,
        stage=decision.stage,
        db=db,
        turn_index=1,
        mirror_level=mirror_level,
        zpd_band=decision.zpd_band,
        hint_used=False,
    )
    await log_reflection(
        user_id=user.id,
        session_id=session.id,
        reflection_text=reflection_text,
        quality_score=tqi_before,
        turn_id=user_turn.id,
        db=db,
    )
    await log_tqi_metric(
        user_id=user.id,
        session_id=session.id,
        tqi_score=tqi_before,
        mirror_level=mirror_level,
        db=db,
        details_json={
            "module": "chat",
            "source": "demo",
            "phase": "before",
            "focus_area": focus_area,
            "direct_answer_blocked": decision.should_divert,
        },
    )
    # 重要操作：写入增强后的投影指标，便于前端直接展示认知增益。
    await log_assistant_turn(
        session_id=session.id,
        content=coach_response,
        stage="refine",
        db=db,
        turn_index=2,
        mirror_level=mirror_level,
        zpd_band=decision.zpd_band,
    )
    await log_tqi_metric(
        user_id=user.id,
        session_id=session.id,
        tqi_score=tqi_after,
        mirror_level=mirror_level,
        db=db,
        details_json={
            "module": "chat",
            "source": "demo",
            "phase": "after_projection",
            "focus_area": focus_area,
            "cognitive_gain": cognitive_gain,
        },
    )

    # 重要操作：额外存一份 session 级增益快照，供统计页直接读取。
    snapshot = CognitiveGainSnapshot(
        user_id=user.id,
        period_type="session",
        period_key=str(session.id),
        baseline_score=tqi_before,
        current_score=tqi_after,
        cognitive_gain=cognitive_gain,
        metrics_json={
            "offload_risk_before": offload_risk_before,
            "offload_risk_after": offload_risk_after,
            "mirror_level": mirror_level,
            "zpd_band": decision.zpd_band,
        },
    )
    db.add(snapshot)
    await db.flush()

    return {
        "session_id": session.id,
        "stage": decision.stage,
        "focus_area": focus_area,
        "mirror_level": mirror_level,
        "zpd_band": decision.zpd_band,
        "direct_answer_blocked": decision.should_divert,
        "diversion_message": decision.diversion_message,
        "tqi_before": tqi_before,
        "tqi_after": tqi_after,
        "cognitive_gain": cognitive_gain,
        "offload_risk_before": offload_risk_before,
        "offload_risk_after": offload_risk_after,
        "audit": {
            "strengths": _detect_strengths(reflection_text, tqi_before),
            "blind_spots": _detect_blind_spots(req.prompt, reflection_text, decision.should_divert, tqi_before),
            "missing_evidence": _missing_evidence(req.prompt, focus_area),
            "next_action": "先补证据，再验证一个前提，最后再决定是否需要提示。",
        },
        "comparison": {
            "draft": reflection_text or "未填写原始思路：系统只能判断你在索取答案，无法审计推理质量。",
            "refined": refined_thought,
            "delta_tags": _build_delta_tags(tqi_before, decision.should_divert, reflection_text),
        },
        "socratic_questions": questions,
        "coach_response": coach_response,
    }
