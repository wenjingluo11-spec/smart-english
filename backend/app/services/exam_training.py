"""专项训练服务 — 自适应出题 + 掌握度更新。"""

import json
import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.exam import ExamQuestion, ExamKnowledgePoint, KnowledgeMastery
from app.services.llm import judge_answer

SECTION_LABELS = {
    "listening": "听力理解",
    "reading": "阅读理解",
    "seven_choose_five": "七选五",
    "cloze": "完形填空",
    "grammar_fill": "语法填空",
    "single_choice": "单项选择",
    "error_correction": "短文改错",
    "writing": "书面表达",
    "application_writing": "应用文写作",
    "continuation_writing": "读后续写",
}

SECTION_STRATEGIES = {
    "listening": "听力技巧：1) 预读选项，预判话题 2) 抓关键词（数字、否定、转折）3) 注意同义替换 4) 第二遍重点听第一遍不确定的题",
    "reading": "阅读技巧：1) 先读题干再读文章 2) 定位关键词回原文 3) 主旨题看首尾段 4) 推断题找文中依据 5) 排除法处理干扰项",
    "seven_choose_five": "七选五技巧：1) 通读全文，把握主旨和结构 2) 关注空格前后的逻辑关系（转折、因果、递进）3) 利用代词指代和词汇复现定位 4) 先做有把握的，再用排除法",
    "cloze": "完形技巧：1) 通读全文把握大意 2) 利用上下文语境 3) 注意固定搭配 4) 语法和逻辑并重 5) 复查时关注前后一致性",
    "grammar_fill": "语法填空技巧：1) 判断词性（给词/不给词）2) 给词变形看句子成分 3) 不给词考虑冠词/介词/连词/代词 4) 注意时态语态一致",
    "single_choice": "单项选择技巧：1) 审清题干，找关键信息 2) 注意时态、语态、主谓一致 3) 辨析近义词和固定搭配 4) 排除法缩小范围",
    "error_correction": "短文改错技巧：1) 逐行分析，关注常考点 2) 名词单复数、动词时态、主谓一致 3) 冠词/介词/连词误用 4) 形容词副词混用 5) 每行最多一处错误",
    "writing": "写作技巧：1) 审题列提纲 2) 开头点题，结尾总结 3) 使用过渡词衔接 4) 适当使用高级句型 5) 检查拼写和语法",
    "application_writing": "应用文写作技巧：1) 明确文体格式（书信、通知、邀请函等）2) 要点齐全，不遗漏 3) 语言得体，注意称呼和落款 4) 词数控制在80左右",
    "continuation_writing": "读后续写技巧：1) 仔细阅读原文，把握情节走向和人物性格 2) 紧扣段首句展开 3) 与原文风格保持一致 4) 注意情节合理性和情感变化 5) 适当使用细节描写",
}


async def get_section_masteries(user_id: int, exam_type: str, db: AsyncSession) -> list[dict]:
    """获取各题型掌握度。"""
    result = await db.execute(
        select(ExamKnowledgePoint.section, func.count(ExamKnowledgePoint.id))
        .where(ExamKnowledgePoint.exam_type == exam_type)
        .group_by(ExamKnowledgePoint.section)
    )
    section_totals = {row[0]: row[1] for row in result.all()}

    # 获取用户已练习的知识点
    result = await db.execute(
        select(
            ExamKnowledgePoint.section,
            func.avg(KnowledgeMastery.mastery_level),
            func.count(KnowledgeMastery.id),
        )
        .join(KnowledgeMastery, KnowledgeMastery.knowledge_point_id == ExamKnowledgePoint.id)
        .where(
            KnowledgeMastery.user_id == user_id,
            ExamKnowledgePoint.exam_type == exam_type,
        )
        .group_by(ExamKnowledgePoint.section)
    )
    section_data = {row[0]: {"avg_mastery": float(row[1] or 0), "practiced": row[2]} for row in result.all()}

    sections = []
    for sec, total in section_totals.items():
        data = section_data.get(sec, {"avg_mastery": 0.0, "practiced": 0})
        sections.append({
            "section": sec,
            "label": SECTION_LABELS.get(sec, sec),
            "mastery": round(data["avg_mastery"], 2),
            "total_points": total,
            "practiced_points": data["practiced"],
        })
    return sections


async def get_adaptive_questions(
    user_id: int, exam_type: str, section: str, limit: int, db: AsyncSession
) -> list[dict]:
    """自适应出题：根据知识点掌握度动态选题。"""
    # 1. 获取该 section 下所有知识点及掌握度
    result = await db.execute(
        select(ExamKnowledgePoint, KnowledgeMastery.mastery_level)
        .outerjoin(
            KnowledgeMastery,
            (KnowledgeMastery.knowledge_point_id == ExamKnowledgePoint.id)
            & (KnowledgeMastery.user_id == user_id),
        )
        .where(
            ExamKnowledgePoint.exam_type == exam_type,
            ExamKnowledgePoint.section == section,
        )
    )
    rows = result.all()

    # 2. 按掌握度分组
    zone_learn = []   # 0.3-0.7 最近发展区
    zone_basic = []   # <0.3 需补基础
    zone_review = []  # >0.7 巩固复习

    for kp, mastery in rows:
        m = mastery or 0.0
        entry = {"kp_id": kp.id, "mastery": m, "difficulty": kp.difficulty}
        if m < 0.3:
            zone_basic.append(entry)
        elif m <= 0.7:
            zone_learn.append(entry)
        else:
            zone_review.append(entry)

    # 3. 按比例分配：60% 最近发展区, 30% 基础, 10% 复习
    selected_kps = []
    n_learn = max(1, int(limit * 0.6))
    n_basic = max(1, int(limit * 0.3))
    n_review = limit - n_learn - n_basic

    for pool, n in [(zone_learn, n_learn), (zone_basic, n_basic), (zone_review, n_review)]:
        pool.sort(key=lambda x: x["mastery"])
        selected_kps.extend(pool[:n])

    if not selected_kps:
        # 没有知识点数据，随机出题
        result = await db.execute(
            select(ExamQuestion)
            .where(ExamQuestion.exam_type == exam_type, ExamQuestion.section == section)
            .order_by(func.random())
            .limit(limit)
        )
        return [_question_to_dict(q) for q in result.scalars().all()]

    # 4. 为每个知识点选题，难度匹配掌握度
    questions = []
    for entry in selected_kps:
        target_diff = max(1, min(5, int(entry["mastery"] * 5) + 1))
        result = await db.execute(
            select(ExamQuestion)
            .where(
                ExamQuestion.exam_type == exam_type,
                ExamQuestion.section == section,
                ExamQuestion.knowledge_point_id == entry["kp_id"],
                ExamQuestion.difficulty.between(max(1, target_diff - 1), min(5, target_diff + 1)),
            )
            .order_by(func.random())
            .limit(1)
        )
        q = result.scalar_one_or_none()
        if q:
            questions.append(_question_to_dict(q))

    # 补足数量
    if len(questions) < limit:
        existing_ids = [q["id"] for q in questions]
        result = await db.execute(
            select(ExamQuestion)
            .where(
                ExamQuestion.exam_type == exam_type,
                ExamQuestion.section == section,
                ExamQuestion.id.notin_(existing_ids) if existing_ids else True,
            )
            .order_by(func.random())
            .limit(limit - len(questions))
        )
        for q in result.scalars().all():
            questions.append(_question_to_dict(q))

    return questions[:limit]


async def submit_training_answer(
    user_id: int, question_id: int, answer: str, db: AsyncSession
) -> dict:
    """批改训练答案 + 更新掌握度。"""
    result = await db.execute(
        select(ExamQuestion).where(ExamQuestion.id == question_id)
    )
    question = result.scalar_one_or_none()
    if not question:
        return {"error": "题目不存在"}

    student_ans = answer.strip()

    # 智能判题：有选项的选择题用字母比较快速路径，其余用 LLM
    judge_explanation = ""
    if question.options_json and json.loads(question.options_json):
        is_correct = student_ans.upper()[:1] == question.answer.strip().upper()[:1]
    elif student_ans:
        try:
            judge_result = await judge_answer(question.content, question.answer or "", student_ans)
            is_correct = judge_result["is_correct"]
            judge_explanation = judge_result.get("explanation", "")
        except Exception:
            is_correct = False
    else:
        is_correct = False

    mastery_before = 0.0
    mastery_after = 0.0

    kp_name = ""
    if question.knowledge_point_id:
        # 获取知识点名称
        kp_result = await db.execute(
            select(ExamKnowledgePoint).where(ExamKnowledgePoint.id == question.knowledge_point_id)
        )
        kp = kp_result.scalar_one_or_none()
        kp_name = kp.name if kp else ""

        # 更新掌握度
        m_result = await db.execute(
            select(KnowledgeMastery)
            .where(
                KnowledgeMastery.user_id == user_id,
                KnowledgeMastery.knowledge_point_id == question.knowledge_point_id,
            )
        )
        mastery = m_result.scalar_one_or_none()
        now = datetime.datetime.now(datetime.timezone.utc)

        if not mastery:
            mastery_before = 0.0
            mastery = KnowledgeMastery(
                user_id=user_id,
                knowledge_point_id=question.knowledge_point_id,
                mastery_level=0.3 if is_correct else 0.0,
                total_attempts=1,
                correct_attempts=1 if is_correct else 0,
                last_practiced_at=now,
            )
            db.add(mastery)
            mastery_after = mastery.mastery_level
        else:
            mastery_before = mastery.mastery_level
            alpha = 0.3
            new_val = mastery.mastery_level * (1 - alpha) + (1.0 if is_correct else 0.0) * alpha
            if mastery.last_practiced_at:
                days_since = (now - mastery.last_practiced_at).days
                decay = max(0.9, 1.0 - days_since * 0.01)
                new_val *= decay
            mastery.mastery_level = min(1.0, max(0.0, new_val))
            mastery.total_attempts += 1
            if is_correct:
                mastery.correct_attempts += 1
            mastery.last_practiced_at = now
            mastery_after = mastery.mastery_level

    await db.flush()

    return {
        "is_correct": is_correct,
        "correct_answer": question.answer,
        "explanation": question.explanation,
        "judge_explanation": judge_explanation,
        "strategy_tip": question.strategy_tip,
        "knowledge_point": kp_name,
        "mastery_before": round(mastery_before, 3),
        "mastery_after": round(mastery_after, 3),
    }


async def get_knowledge_points_with_mastery(user_id: int, exam_type: str, section: str | None, db: AsyncSession) -> list[dict]:
    """获取知识点列表及掌握度。"""
    query = (
        select(ExamKnowledgePoint, KnowledgeMastery.mastery_level)
        .outerjoin(
            KnowledgeMastery,
            (KnowledgeMastery.knowledge_point_id == ExamKnowledgePoint.id)
            & (KnowledgeMastery.user_id == user_id),
        )
        .where(ExamKnowledgePoint.exam_type == exam_type)
    )
    if section:
        query = query.where(ExamKnowledgePoint.section == section)
    query = query.order_by(ExamKnowledgePoint.section, ExamKnowledgePoint.category, ExamKnowledgePoint.id)
    result = await db.execute(query)
    return [
        {
            "id": kp.id,
            "section": kp.section,
            "category": kp.category,
            "name": kp.name,
            "difficulty": kp.difficulty,
            "frequency": kp.frequency,
            "mastery": round(float(mastery or 0), 2),
        }
        for kp, mastery in result.all()
    ]


async def update_mastery(user_id: int, kp_id: int, is_correct: bool, db: AsyncSession) -> float:
    """更新知识点掌握度，返回新掌握度。供其他服务调用。"""
    now = datetime.datetime.now(datetime.timezone.utc)
    m_result = await db.execute(
        select(KnowledgeMastery)
        .where(KnowledgeMastery.user_id == user_id, KnowledgeMastery.knowledge_point_id == kp_id)
    )
    mastery = m_result.scalar_one_or_none()
    if not mastery:
        mastery = KnowledgeMastery(
            user_id=user_id,
            knowledge_point_id=kp_id,
            mastery_level=0.3 if is_correct else 0.0,
            total_attempts=1,
            correct_attempts=1 if is_correct else 0,
            last_practiced_at=now,
        )
        db.add(mastery)
        await db.flush()
        return mastery.mastery_level

    alpha = 0.3
    new_val = mastery.mastery_level * (1 - alpha) + (1.0 if is_correct else 0.0) * alpha
    if mastery.last_practiced_at:
        days_since = (now - mastery.last_practiced_at).days
        decay = max(0.9, 1.0 - days_since * 0.01)
        new_val *= decay
    mastery.mastery_level = min(1.0, max(0.0, new_val))
    mastery.total_attempts += 1
    if is_correct:
        mastery.correct_attempts += 1
    mastery.last_practiced_at = now
    await db.flush()
    return mastery.mastery_level


def get_section_strategy(section: str) -> str:
    return SECTION_STRATEGIES.get(section, "")


def _question_to_dict(q: ExamQuestion) -> dict:
    return {
        "id": q.id,
        "section": q.section,
        "difficulty": q.difficulty,
        "content": q.content,
        "passage_text": q.passage_text,
        "options": json.loads(q.options_json) if q.options_json else [],
        "knowledge_point_id": q.knowledge_point_id,
        "year": q.year,
        "strategy_tip": q.strategy_tip,
    }
