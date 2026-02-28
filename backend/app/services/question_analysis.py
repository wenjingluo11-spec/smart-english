"""题眼分析服务 — AI 识别题目关键信息，教学生"怎么审题"而不是"答案是什么"。

V2 新增：审题轨迹（gaze_path）生成 + 审题演示数据。
"""

import hashlib
import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.question_analysis import QuestionAnalysis, HumanAnnotation
from app.services.llm import chat_once_json

# ── V1 题眼分析 prompt ──

_ANALYSIS_SYSTEM_PROMPT = """你是一个英语学霸审题专家，专门教学生"怎么看题"。

你的任务是分析一道英语题目，告诉学生：
1. 题眼（question_eye）——整道题最关键的那一句话或那几个词，抓住它就能解题。很多长题干中大部分内容是干扰，题眼往往就一句话
2. 题眼线索（key_phrases）——除了题眼之外，哪些词/短语是辅助解题的关键线索
3. 审题顺序（reading_order）——学霸拿到这道题，眼睛先看哪里、再看哪里
4. 审题策略（strategy）——用简洁的话说清楚"学霸是怎么看出来的"
5. 干扰项分析（distractors）——如果是选择题，哪些选项容易误选、为什么

重要原则：
- 不要给出答案！只教审题方法
- question_eye 和 key_phrases 中的 text 必须是题目原文中的精确子串
- 题眼是最核心的，必须准确标注。长题干中可能90%的内容都是背景铺垫，题眼可能就最后一句话
- 用中文解释，因为学生是中国学生
- 策略要具体，不要泛泛而谈

返回 JSON 格式：
{
    "question_eye": {
        "eye_text": "题目原文中最关键的那句话或短语（精确子串）",
        "eye_position": "beginning|middle|end",
        "why_this_is_eye": "一句话解释为什么这是题眼",
        "noise_zones": ["题干中可以快速略过的部分描述1", "部分描述2"]
    },
    "key_phrases": [
        {"text": "原文中的精确文本", "role": "signal_word|key_info|context_clue|grammar_point", "importance": "high|medium", "hint": "这个词/短语为什么重要的简短说明"}
    ],
    "reading_order": [
        {"step": 1, "target": "先看什么", "action": "做什么动作", "reason": "为什么先看这里"}
    ],
    "strategy": "一句话总结审题策略",
    "distractors": [
        {"option": "A/B/C/D", "trap": "这个选项的陷阱是什么"}
    ]
}"""

# ── V2 审题轨迹 prompt ──

_GAZE_PATH_SYSTEM_PROMPT = """你是一个英语学霸，正在演示你的审题过程。

你需要模拟自己看题时"眼睛的移动轨迹"——你先看哪个词、停留多久、内心在想什么。
这个轨迹会被用来做动画演示，让学生看到"学霸的眼睛是怎么扫题的"。

规则：
1. gaze_path 是一个时间轴序列，每一步代表你的目光停留在题目中的某个位置
2. target_text 必须是题目原文中的精确子串（一个词或短语）
3. action 是你此刻的动作：focus（聚焦细看）、scan（快速扫过）、compare（对比）、skip（跳过）、return（回看）
4. highlight_type 标注这个位置的语义角色：question_eye（题眼，最关键的解题信息）、signal_word（信号词）、key_info（关键信息）、context_clue（上下文线索）、distractor（干扰信息，可跳过）、normal（普通文本）
5. duration_ms 是停留时间（毫秒），focus 通常 800-1500ms，scan 通常 300-500ms，compare 通常 1000-2000ms
6. thought 是你此刻的内心独白（中文，简短，口语化），比如"嗯，这里有个however..."
7. narration 是完整的审题旁白文本（中文），像老师讲课一样，串联整个审题过程

返回 JSON 格式：
{
    "gaze_path": [
        {
            "step": 1,
            "target_text": "题目中的精确文本",
            "action": "focus|scan|compare|skip|return",
            "highlight_type": "question_eye|signal_word|key_info|context_clue|distractor|normal",
            "duration_ms": 1000,
            "thought": "内心独白"
        }
    ],
    "narration": "完整的审题旁白，像老师讲课一样串联整个过程，2-4句话"
}"""


def _hash_question(content: str, question_type: str = "") -> str:
    """生成题目内容的 hash，用于缓存去重。"""
    raw = f"{question_type}|{content}"
    return hashlib.sha256(raw.encode()).hexdigest()


async def analyze_question(
    db: AsyncSession,
    question_content: str,
    question_type: str = "",
    options: str = "",
    question_id: int | None = None,
    subject: str = "english",
) -> dict:
    """V1: 分析题目的题眼、审题顺序、策略。优先从缓存读取。"""
    q_hash = _hash_question(question_content + options, question_type)

    # 1. 查缓存
    result = await db.execute(
        select(QuestionAnalysis).where(QuestionAnalysis.question_hash == q_hash)
    )
    cached = result.scalar_one_or_none()

    if cached:
        return {
            "question_eye": json.loads(cached.question_eye_json) if cached.question_eye_json else None,
            "key_phrases": json.loads(cached.key_phrases_json) if cached.key_phrases_json else [],
            "reading_order": json.loads(cached.reading_order_json) if cached.reading_order_json else [],
            "strategy": cached.strategy,
            "distractors": json.loads(cached.distractors_json) if cached.distractors_json else [],
        }

    # 2. 调用 LLM 分析
    subject_hint = "" if subject == "english" else f"\n【学科】{subject}"
    user_prompt = f"【题型】{question_type}{subject_hint}\n\n【题目内容】\n{question_content}"
    if options:
        user_prompt += f"\n\n【选项】\n{options}"

    try:
        analysis = await chat_once_json(_ANALYSIS_SYSTEM_PROMPT, user_prompt)
    except Exception:
        return {
            "question_eye": None,
            "key_phrases": [],
            "reading_order": [],
            "strategy": "",
            "distractors": [],
        }

    # 3. 标准化并存入缓存
    question_eye = analysis.get("question_eye", None)
    key_phrases = analysis.get("key_phrases", [])
    reading_order = analysis.get("reading_order", [])
    strategy = analysis.get("strategy", "")
    distractors = analysis.get("distractors", [])

    cached_record = QuestionAnalysis(
        question_id=question_id,
        question_hash=q_hash,
        question_type=question_type,
        question_eye_json=json.dumps(question_eye, ensure_ascii=False) if question_eye else None,
        key_phrases_json=json.dumps(key_phrases, ensure_ascii=False),
        reading_order_json=json.dumps(reading_order, ensure_ascii=False),
        strategy=strategy,
        distractors_json=json.dumps(distractors, ensure_ascii=False),
    )
    db.add(cached_record)
    await db.commit()

    return {
        "question_eye": question_eye,
        "key_phrases": key_phrases,
        "reading_order": reading_order,
        "strategy": strategy,
        "distractors": distractors,
    }


async def generate_gaze_path(
    db: AsyncSession,
    question_content: str,
    question_type: str = "",
    options: str = "",
    question_id: int | None = None,
    subject: str = "english",
) -> dict:
    """V2: 生成审题轨迹（gaze_path）— 模拟学霸眼睛看题的时间轴序列。

    优先从缓存读取，未命中则调用 LLM 生成。
    也会检查是否有人工标注数据，优先使用人工标注。

    Returns:
        {
            "gaze_path": [{"step", "target_text", "action", "duration_ms", "thought"}],
            "narration": "完整审题旁白",
            "source": "ai" | "human"
        }
    """
    q_hash = _hash_question(question_content + options, question_type)

    # 1. 优先查人工标注
    if question_id:
        ha_result = await db.execute(
            select(HumanAnnotation)
            .where(HumanAnnotation.question_id == question_id)
            .order_by(HumanAnnotation.quality_score.desc().nullslast())
            .limit(1)
        )
        human = ha_result.scalar_one_or_none()
        if human and human.gaze_path_json:
            return {
                "gaze_path": json.loads(human.gaze_path_json),
                "narration": human.narration or "",
                "source": "human",
            }

    # 2. 查 AI 缓存
    result = await db.execute(
        select(QuestionAnalysis).where(QuestionAnalysis.question_hash == q_hash)
    )
    cached = result.scalar_one_or_none()

    if cached and cached.gaze_path_json:
        return {
            "gaze_path": json.loads(cached.gaze_path_json),
            "narration": cached.narration or "",
            "source": "ai",
        }

    # 3. 调用 LLM 生成（注入学科上下文 + 知识库最佳策略）
    subject_hint = "" if subject == "english" else f"\n【学科】{subject}（请根据该学科特点调整审题策略）"
    kb_hint = ""
    if question_type:
        from app.models.behavior import CognitiveKnowledgeBase
        kb_result = await db.execute(
            select(CognitiveKnowledgeBase).where(
                CognitiveKnowledgeBase.question_type == question_type,
                CognitiveKnowledgeBase.subject == subject,
            ).limit(1)
        )
        kb = kb_result.scalar_one_or_none()
        if kb and kb.best_strategy_json:
            import json as _json
            strategy = _json.loads(kb.best_strategy_json)
            if strategy.get("name"):
                kb_hint = f"\n【参考最佳策略】{strategy['name']}: {strategy.get('description', '')}"

    user_prompt = f"【题型】{question_type}{subject_hint}{kb_hint}\n\n【题目内容】\n{question_content}"
    if options:
        user_prompt += f"\n\n【选项】\n{options}"

    try:
        demo_data = await chat_once_json(_GAZE_PATH_SYSTEM_PROMPT, user_prompt)
    except Exception:
        return {"gaze_path": [], "narration": "", "source": "ai"}

    gaze_path = demo_data.get("gaze_path", [])
    narration = demo_data.get("narration", "")

    # 4. 存入缓存（更新已有记录或创建新记录）
    if cached:
        cached.gaze_path_json = json.dumps(gaze_path, ensure_ascii=False)
        cached.narration = narration
    else:
        new_record = QuestionAnalysis(
            question_id=question_id,
            question_hash=q_hash,
            question_type=question_type,
            gaze_path_json=json.dumps(gaze_path, ensure_ascii=False),
            narration=narration,
        )
        db.add(new_record)
    await db.commit()

    return {"gaze_path": gaze_path, "narration": narration, "source": "ai"}


# ── V3 长题干审题辅助 ──

_LONG_STEM_PROMPT = """你是一个英语审题专家，专门帮助学生快速审读长题干。

现在题干越来越长，很多学生根本审不完题。你的任务是分析这道长题干，告诉学生：
1. 题干结构：哪些是背景铺垫（可快速略过），哪些是关键条件，哪些是真正的问题
2. 阅读优先级：哪些部分必读，哪些可略读，哪些可跳过
3. 题眼位置：最关键的那句话在哪里
4. 建议审题时间：根据题干长度和复杂度给出建议

重要原则：
- 不要给出答案，只教审题方法
- 所有引用的文本必须是题干原文的精确子串
- 用中文解释

返回 JSON 格式：
{
    "stem_structure": [
        {"text": "题干原文片段（精确子串）", "role": "background|condition|question|noise", "priority": "must_read|skim|skip"}
    ],
    "eye_sentence": "题干中最关键的那句话（精确子串）",
    "reading_path": "一句话描述建议的阅读路径，比如'先看最后一句问题，再回到第二段找条件'",
    "time_estimate_seconds": 30,
    "tip": "一句话审题建议"
}"""


async def analyze_long_stem(
    question_content: str,
    question_type: str = "",
    options: str = "",
) -> dict:
    """V3: 分析长题干结构，帮助学生快速定位关键信息。

    仅在题干超过100字符时有意义。不做缓存（实时性要求高）。
    """
    if len(question_content) < 100:
        return {"stem_structure": [], "eye_sentence": "", "reading_path": "", "time_estimate_seconds": 0, "tip": ""}

    user_prompt = f"【题型】{question_type}\n\n【题干】\n{question_content}"
    if options:
        user_prompt += f"\n\n【选项】\n{options}"

    try:
        result = await chat_once_json(_LONG_STEM_PROMPT, user_prompt)
    except Exception:
        return {"stem_structure": [], "eye_sentence": "", "reading_path": "", "time_estimate_seconds": 0, "tip": ""}

    return {
        "stem_structure": result.get("stem_structure", []),
        "eye_sentence": result.get("eye_sentence", ""),
        "reading_path": result.get("reading_path", ""),
        "time_estimate_seconds": result.get("time_estimate_seconds", 0),
        "tip": result.get("tip", ""),
    }
