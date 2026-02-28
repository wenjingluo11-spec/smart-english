"""种子数据：认知增强功能演示数据。

插入混合题型的示例题目 + 预生成的题眼分析 / 审题轨迹 / 长题干分析数据，
让前端可以直接展示所有5个认知增强功能，无需调用 LLM。

运行方式（从 backend/ 目录）：
    python -m scripts.seed_cognitive_demo
"""

import asyncio
import hashlib
import json

from sqlalchemy import select, func
from app.models import Base
from app.models.user import User
from app.models.question import Question
from app.models.question_analysis import QuestionAnalysis
from app.database import engine, async_session
from app.services.auth import hash_password


def _hash(content: str, qtype: str = "") -> str:
    return hashlib.sha256(f"{qtype}|{content}".encode()).hexdigest()


# ════════════════════════════════════════
# Q1: 单项选择（语法题）
# 展示: TextHighlighter + ExpertDemo + MultimodalEnhancer
# ════════════════════════════════════════

Q1_CONTENT = (
    "The research team announced that they _____ a new method "
    "to reduce carbon emissions by 40% before the end of next year."
)

Q1 = {
    "stage": "高中", "grade": "高一", "topic": "时态语态",
    "difficulty": 3, "question_type": "单选",
    "content": Q1_CONTENT,
    "options_json": {
        "A": "will develop", "B": "would have developed",
        "C": "will have developed", "D": "had developed",
    },
    "answer": "C",
    "explanation": "by the end of next year 表示将来某时间点之前完成，用将来完成时 will have developed。",
}

Q1_OPTIONS = "A. will develop\nB. would have developed\nC. will have developed\nD. had developed"

Q1_ANALYSIS = {
    "question_eye": {
        "eye_text": "before the end of next year",
        "eye_position": "end",
        "why_this_is_eye": "by/before + 将来时间点 是判断将来完成时的核心标志",
        "noise_zones": ["to reduce carbon emissions by 40% 是目的状语，不影响时态判断"],
    },
    "key_phrases": [
        {"text": "announced", "role": "signal_word", "importance": "high",
         "hint": "主句过去时，提示宾语从句可能需要时态呼应"},
        {"text": "before the end of next year", "role": "key_info", "importance": "high",
         "hint": "将来时间点标志，决定用将来完成时"},
        {"text": "a new method", "role": "context_clue", "importance": "medium",
         "hint": "宾语从句的宾语，develop 的对象"},
        {"text": "to reduce carbon emissions by 40%", "role": "context_clue", "importance": "low",
         "hint": "目的状语，可快速略过"},
    ],
    "reading_order": [
        {"step": 1, "target": "整句快速扫读", "action": "了解句子结构", "reason": "先把握全局"},
        {"step": 2, "target": "announced", "action": "确认主句时态", "reason": "主句时态影响从句"},
        {"step": 3, "target": "空格位置", "action": "定位考点", "reason": "空格在宾语从句中"},
        {"step": 4, "target": "before the end of next year", "action": "找时间标志词", "reason": "决定时态的关键"},
        {"step": 5, "target": "四个选项", "action": "对比时态", "reason": "排除不符合的选项"},
    ],
    "strategy": "抓住时间标志词 before the end of next year，by/before + 将来时间 = 将来完成时",
    "distractors": [
        {"option": "B", "trap": "would have developed 是过去将来完成时，用于虚拟语气"},
        {"option": "D", "trap": "had developed 是过去完成时，但题目说的是将来的事"},
    ],
}

Q1_GAZE_PATH = [
    {"step": 1, "target_text": "The research team announced",
     "action": "scan", "highlight_type": "normal", "duration_ms": 400,
     "thought": "先快速扫一眼，看看句子大意..."},
    {"step": 2, "target_text": "announced",
     "action": "focus", "highlight_type": "signal_word", "duration_ms": 1000,
     "thought": "嗯，主句用了过去时 announced，这是个信号词"},
    {"step": 3, "target_text": "_____",
     "action": "focus", "highlight_type": "question_eye", "duration_ms": 800,
     "thought": "空格在 that 引导的宾语从句里，要判断从句时态"},
    {"step": 4, "target_text": "a new method",
     "action": "scan", "highlight_type": "key_info", "duration_ms": 400,
     "thought": "develop 的宾语，了解一下语境"},
    {"step": 5, "target_text": "to reduce carbon emissions by 40%",
     "action": "skip", "highlight_type": "distractor", "duration_ms": 300,
     "thought": "这是目的状语，跟时态无关，跳过"},
    {"step": 6, "target_text": "before the end of next year",
     "action": "focus", "highlight_type": "question_eye", "duration_ms": 1500,
     "thought": "这就是题眼！before + 将来时间点，典型的将来完成时标志"},
    {"step": 7, "target_text": "will have developed",
     "action": "compare", "highlight_type": "key_info", "duration_ms": 1200,
     "thought": "C选项 will have developed 是将来完成时，完美匹配"},
    {"step": 8, "target_text": "before the end of next year",
     "action": "return", "highlight_type": "question_eye", "duration_ms": 800,
     "thought": "再确认一下，by/before + 将来时间 = 将来完成时，选C"},
]

Q1_NARRATION = (
    "我们来看这道时态题。首先快速扫一遍全句，注意到主句用了过去时 announced。"
    "然后看空格位置，在 that 引导的宾语从句中。关键是句末的 before the end of next year，"
    "这是一个将来时间标志词。by 或 before 加将来时间点，就是将来完成时的标志。"
    "所以答案是 C，will have developed。注意不要被 B 选项迷惑，"
    "would have developed 是虚拟语气，这里不是虚拟。"
)


# ════════════════════════════════════════
# Q2: 完形填空
# 展示: SyncReader + TextHighlighter
# ════════════════════════════════════════

Q2_CONTENT = (
    "Last summer, I volunteered at a wildlife rescue center. On my first day, I was "
    "asked to feed a baby deer that had been ___1___ by its mother. At first, the deer "
    "was ___2___ of me and refused to eat. I sat quietly beside it for hours, speaking "
    "softly. Gradually, it began to ___3___ me. By the end of the week, it would run "
    "to me whenever I ___4___. This experience taught me that trust is not given — it "
    "must be ___5___ through patience and kindness."
)

Q2 = {
    "stage": "高中", "grade": "高二", "topic": "完形填空",
    "difficulty": 4, "question_type": "完形填空",
    "content": Q2_CONTENT,
    "options_json": {
        "1": {"A": "abandoned", "B": "raised", "C": "protected", "D": "followed"},
        "2": {"A": "fond", "B": "afraid", "C": "proud", "D": "aware"},
        "3": {"A": "ignore", "B": "fear", "C": "trust", "D": "avoid"},
        "4": {"A": "left", "B": "arrived", "C": "called", "D": "disappeared"},
        "5": {"A": "demanded", "B": "earned", "C": "broken", "D": "forgotten"},
    },
    "answer": "1-A 2-B 3-C 4-B 5-B",
    "explanation": "核心主题是信任需要通过耐心和善良来赢得。",
}

Q2_OPTIONS = (
    "1. A.abandoned B.raised C.protected D.followed\n"
    "2. A.fond B.afraid C.proud D.aware\n"
    "3. A.ignore B.fear C.trust D.avoid\n"
    "4. A.left B.arrived C.called D.disappeared\n"
    "5. A.demanded B.earned C.broken D.forgotten"
)

Q2_ANALYSIS = {
    "question_eye": {
        "eye_text": "trust is not given",
        "eye_position": "end",
        "why_this_is_eye": "最后一句是全文主旨句，点明核心主题",
        "noise_zones": ["wildlife rescue center 只是背景设定"],
    },
    "key_phrases": [
        {"text": "abandoned", "role": "key_info", "importance": "high",
         "hint": "被遗弃，与后文建立信任形成对比"},
        {"text": "refused to eat", "role": "signal_word", "importance": "high",
         "hint": "说明小鹿一开始不信任"},
        {"text": "Gradually", "role": "signal_word", "importance": "high",
         "hint": "转折信号词，表示变化开始"},
        {"text": "patience and kindness", "role": "key_info", "importance": "high",
         "hint": "全文主题词，信任的来源"},
    ],
    "reading_order": [
        {"step": 1, "target": "全文快速通读", "action": "把握故事大意",
         "reason": "完形填空先看全局"},
        {"step": 2, "target": "最后一句主旨句", "action": "确定文章主题",
         "reason": "主旨句决定全文基调"},
        {"step": 3, "target": "逐空回填", "action": "结合上下文选词",
         "reason": "每个空都要看前后语境"},
    ],
    "strategy": "完形填空先通读全文抓主旨，最后一句是点睛之笔",
    "distractors": [
        {"option": "1-B", "trap": "raised 是抚养，但后文说小鹿不信任人"},
        {"option": "5-A", "trap": "demanded 是要求，信任不能被要求"},
    ],
}

Q2_GAZE_PATH = [
    {"step": 1, "target_text": "Last summer, I volunteered at a wildlife rescue center.",
     "action": "scan", "highlight_type": "normal", "duration_ms": 500,
     "thought": "背景信息，野生动物救助中心，快速扫过"},
    {"step": 2, "target_text": "feed a baby deer",
     "action": "focus", "highlight_type": "key_info", "duration_ms": 800,
     "thought": "喂一只小鹿，这是故事的主角"},
    {"step": 3, "target_text": "___1___",
     "action": "focus", "highlight_type": "question_eye", "duration_ms": 1000,
     "thought": "第一个空，小鹿被母亲怎么了？后面说它不信任人..."},
    {"step": 4, "target_text": "refused to eat",
     "action": "focus", "highlight_type": "signal_word", "duration_ms": 1000,
     "thought": "拒绝吃东西，说明小鹿害怕人，第一空应该是 abandoned"},
    {"step": 5, "target_text": "Gradually",
     "action": "focus", "highlight_type": "signal_word", "duration_ms": 800,
     "thought": "Gradually 是转折信号词，表示情况开始变化"},
    {"step": 6, "target_text": "trust is not given",
     "action": "focus", "highlight_type": "question_eye", "duration_ms": 1200,
     "thought": "这是全文主旨！信任不是给予的，而是要赢得的"},
    {"step": 7, "target_text": "patience and kindness",
     "action": "focus", "highlight_type": "key_info", "duration_ms": 1000,
     "thought": "耐心和善良，第5空选 earned"},
]

Q2_NARRATION = (
    "这是一篇完形填空，先快速通读全文。故事讲的是在野生动物救助中心照顾小鹿。"
    "注意最后一句是主旨句：trust is not given, it must be earned。"
    "有了这个主旨，回头看每个空就清晰了。"
)


# ════════════════════════════════════════
# Q3: 阅读理解（长题干 >100字符）
# 展示: StemNavigator + PreAnswerGuide
# ════════════════════════════════════════

Q3_CONTENT = (
    "In recent years, the concept of 'digital detox' has gained significant attention "
    "as more people recognize the negative effects of excessive screen time on mental "
    "health. A 2024 study conducted by researchers at Stanford University surveyed over "
    "5,000 participants aged 18-35 and found that those who spent more than six hours "
    "daily on social media reported higher levels of anxiety and depression compared to "
    "those who limited their usage to under two hours. The study also revealed an "
    "interesting paradox: while 78% of heavy users acknowledged that social media "
    "negatively affected their well-being, only 23% had actually attempted to reduce "
    "their screen time. Dr. Sarah Chen, the lead researcher, explained that this gap "
    "between awareness and action is largely due to the addictive design of social "
    "media platforms, which use algorithms to maximize user engagement. She suggested "
    "that effective digital detox programs should combine gradual reduction strategies "
    "with alternative offline activities, rather than demanding complete abstinence.\n\n"
    "According to the passage, what is the main reason for the gap between users' "
    "awareness of social media's harm and their failure to reduce usage?"
)

Q3 = {
    "stage": "高中", "grade": "高三", "topic": "阅读理解",
    "difficulty": 5, "question_type": "阅读理解",
    "content": Q3_CONTENT,
    "options_json": {
        "A": "Users lack knowledge about the negative effects.",
        "B": "Social media platforms are designed to be addictive.",
        "C": "There are no effective digital detox programs.",
        "D": "Users prefer online activities over offline ones.",
    },
    "answer": "B",
    "explanation": "Dr. Sarah Chen 指出 the addictive design of social media platforms。",
}

Q3_OPTIONS = (
    "A. Users lack knowledge about the negative effects.\n"
    "B. Social media platforms are designed to be addictive.\n"
    "C. There are no effective digital detox programs.\n"
    "D. Users prefer online activities over offline ones."
)

Q3_ANALYSIS = {
    "question_eye": {
        "eye_text": "the addictive design of social media platforms",
        "eye_position": "end",
        "why_this_is_eye": "Dr. Chen 直接给出了 gap 的原因",
        "noise_zones": [
            "Stanford University 和 5000 participants 是背景数据",
            "78% 和 23% 的数据只是描述现象",
        ],
    },
    "key_phrases": [
        {"text": "this gap between awareness and action",
         "role": "signal_word", "importance": "high",
         "hint": "题目问的就是这个 gap 的原因"},
        {"text": "addictive design", "role": "key_info",
         "importance": "high", "hint": "直接回答原因"},
        {"text": "algorithms to maximize user engagement",
         "role": "context_clue", "importance": "high",
         "hint": "解释 addictive design 的具体机制"},
    ],
    "reading_order": [
        {"step": 1, "target": "先看问题",
         "action": "明确要找什么", "reason": "带着问题读文章"},
        {"step": 2, "target": "定位 gap 关键词",
         "action": "在文中找对应句", "reason": "题目问 gap 的原因"},
        {"step": 3, "target": "Dr. Sarah Chen explained",
         "action": "读原因解释", "reason": "explained 后面就是答案"},
    ],
    "strategy": "先读问题再定位，找到 explained/because 等因果信号词",
    "distractors": [
        {"option": "A", "trap": "文中说78%的人知道危害，不是缺乏知识"},
        {"option": "C", "trap": "文中提到了有效方案，不是没有"},
    ],
}

Q3_GAZE_PATH = [
    {"step": 1, "target_text": "what is the main reason for the gap",
     "action": "focus", "highlight_type": "question_eye", "duration_ms": 1200,
     "thought": "先看问题！问的是 gap 的原因"},
    {"step": 2, "target_text": "digital detox",
     "action": "scan", "highlight_type": "normal", "duration_ms": 400,
     "thought": "数字排毒，了解主题"},
    {"step": 3, "target_text": "5,000 participants aged 18-35",
     "action": "skip", "highlight_type": "distractor", "duration_ms": 300,
     "thought": "具体数据，背景信息，跳过"},
    {"step": 4, "target_text": "78% of heavy users acknowledged",
     "action": "scan", "highlight_type": "context_clue", "duration_ms": 600,
     "thought": "78%的人知道有害，但只有23%尝试减少，这就是 gap"},
    {"step": 5, "target_text": "this gap between awareness and action",
     "action": "focus", "highlight_type": "signal_word", "duration_ms": 1000,
     "thought": "找到了！题目问的就是这个 gap"},
    {"step": 6, "target_text": "addictive design of social media platforms",
     "action": "focus", "highlight_type": "question_eye", "duration_ms": 1500,
     "thought": "这就是答案！成瘾性设计是 gap 的原因"},
    {"step": 7, "target_text": "algorithms to maximize user engagement",
     "action": "focus", "highlight_type": "key_info", "duration_ms": 1000,
     "thought": "算法最大化用户参与度，解释了为什么会上瘾"},
    {"step": 8, "target_text": "Social media platforms are designed to be addictive",
     "action": "compare", "highlight_type": "key_info", "duration_ms": 1200,
     "thought": "对比选项B，和原文完美对应，选B"},
]

Q3_NARRATION = (
    "这是一道阅读理解细节题。先看问题，问的是 gap 的原因。"
    "回到文中定位 gap 这个关键词，找到 Dr. Chen 的解释："
    "addictive design of social media platforms。选B。"
)


# ════════════════════════════════════════
# 主函数：插入种子数据
# ════════════════════════════════════════

DEMO_PHONE = "13800000001"
DEMO_PASSWORD = "demo123456"


async def main():
    # 建表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # 1. 创建 demo 用户
        result = await db.execute(
            select(User).where(User.phone == DEMO_PHONE)
        )
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                phone=DEMO_PHONE,
                hashed_password=hash_password(DEMO_PASSWORD),
                grade_level="高中",
                grade="高一",
                cefr_level="B1",
            )
            db.add(user)
            await db.flush()
            print(f"  + 创建 demo 用户: {DEMO_PHONE} / {DEMO_PASSWORD}")
        else:
            print(f"  = demo 用户已存在: {DEMO_PHONE}")

        # 2. 插入示例题目
        questions_data = [
            (Q1, Q1_OPTIONS, Q1_ANALYSIS, Q1_GAZE_PATH, Q1_NARRATION),
            (Q2, Q2_OPTIONS, Q2_ANALYSIS, Q2_GAZE_PATH, Q2_NARRATION),
            (Q3, Q3_OPTIONS, Q3_ANALYSIS, Q3_GAZE_PATH, Q3_NARRATION),
        ]

        inserted_ids = []
        for q_data, opts_text, analysis, gaze_path, narration in questions_data:
            # 检查是否已存在
            result = await db.execute(
                select(Question).where(Question.content == q_data["content"])
            )
            existing = result.scalar_one_or_none()
            if existing:
                inserted_ids.append(existing.id)
                print(f"  = 题目已存在 (id={existing.id}): {q_data['question_type']}")
                continue

            q = Question(**q_data)
            db.add(q)
            await db.flush()
            inserted_ids.append(q.id)
            print(f"  + 插入题目 (id={q.id}): {q_data['question_type']}")

        # 3. 插入预生成的分析数据
        for i, (q_data, opts_text, analysis, gaze_path, narration) in enumerate(questions_data):
            qid = inserted_ids[i]
            content_with_opts = q_data["content"] + opts_text
            q_hash = _hash(content_with_opts, q_data["question_type"])

            result = await db.execute(
                select(QuestionAnalysis).where(
                    QuestionAnalysis.question_hash == q_hash
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                print(f"  = 分析数据已存在 (question_id={qid})")
                continue

            qa = QuestionAnalysis(
                question_id=qid,
                question_hash=q_hash,
                question_type=q_data["question_type"],
                question_eye_json=json.dumps(
                    analysis.get("question_eye"), ensure_ascii=False
                ),
                key_phrases_json=json.dumps(
                    analysis.get("key_phrases", []), ensure_ascii=False
                ),
                reading_order_json=json.dumps(
                    analysis.get("reading_order", []), ensure_ascii=False
                ),
                strategy=analysis.get("strategy", ""),
                distractors_json=json.dumps(
                    analysis.get("distractors", []), ensure_ascii=False
                ),
                gaze_path_json=json.dumps(gaze_path, ensure_ascii=False),
                narration=narration,
            )
            db.add(qa)
            print(f"  + 插入分析数据 (question_id={qid})")

        await db.commit()
        print("\n✓ 认知增强演示数据插入完成！")
        print(f"  题目 IDs: {inserted_ids}")
        print(f"  Demo 登录: {DEMO_PHONE} / {DEMO_PASSWORD}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
