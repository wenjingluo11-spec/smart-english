"""从 edu_distill 高中英语数据自动提取知识点。

用法：
    cd backend && python -m scripts.seed_exam_knowledge_points
"""

import asyncio
import json
from pathlib import Path
from collections import Counter
from app.models import Base
from app.models.exam import ExamKnowledgePoint
from app.database import engine, async_session
from sqlalchemy import select

# edu_distill 数据路径
EDU_DISTILL_BASE = Path(__file__).resolve().parent.parent.parent.parent / "edu-distill"
DATA_FILES = [
    EDU_DISTILL_BASE / "data" / "validated" / "高中" / "英语" / "高二.jsonl",
    EDU_DISTILL_BASE / "data" / "validated" / "高中" / "英语" / "高三.jsonl",
]

# question_type → section 映射
QUESTION_TYPE_TO_SECTION = {
    "语法填空": "grammar_fill",
    "单项选择": "grammar_fill",
    "单项选择题": "grammar_fill",
    "对话填空": "grammar_fill",
    "综合填空": "grammar_fill",
    "句型转换": "grammar_fill",
    "单词拼写": "grammar_fill",
    "词汇辨析": "grammar_fill",
    "词义配对": "grammar_fill",
    "句子翻译": "grammar_fill",
    "句子改写": "grammar_fill",
    "语法分析": "grammar_fill",
    "综合应用": "grammar_fill",
    "词汇运用": "grammar_fill",
    "词汇运用题": "grammar_fill",
    "词形转换": "grammar_fill",
    "语境填空": "grammar_fill",
    "综合运用": "grammar_fill",
    "句式转换": "grammar_fill",
    "语法辨析": "grammar_fill",
    "语法识别": "grammar_fill",
    "语法对比分析": "grammar_fill",
    "句子分析": "grammar_fill",
    "情景完成": "grammar_fill",
    "情景应用": "grammar_fill",
    "对话填空与语法运用": "grammar_fill",
    "语法填空与句子改写": "grammar_fill",
    "语法填空与改错综合": "grammar_fill",
    "改写句子": "grammar_fill",
    "句型改写": "grammar_fill",
    "修辞改写": "grammar_fill",
    "修辞分析": "grammar_fill",
    "阅读理解": "reading",
    "七选五": "reading",
    "长难句分析": "reading",
    "科技短文": "reading",
    "推理判断": "reading",
    "阅读理解与语法分析": "reading",
    "对比分析": "reading",
    "文本分析": "reading",
    "完形填空": "cloze",
    "短文改错": "error_correction",
    "改错题": "error_correction",
    "综合改错": "error_correction",
    "语法改错": "error_correction",
    "改错": "error_correction",
    "改错题/句型转换": "error_correction",
    "写作": "writing",
    "应用文写作": "writing",
    "读后续写": "writing",
    "建议信": "writing",
    "通知": "writing",
    "辩论稿": "writing",
    "演讲词": "writing",
    "新闻报道": "writing",
    "电子邮件": "writing",
    "概要写作": "writing",
    "分析写作": "writing",
    "写作应用": "writing",
    "综合分析": "writing",
    "专栏短文": "writing",
    "电子邮件写作": "writing",
    "发言稿": "writing",
    "活动通知": "writing",
    "段落写作": "writing",
    "演讲稿": "writing",
    "征文": "writing",
    "专栏投稿": "writing",
    "议论文": "writing",
    "科技评论文": "writing",
    "评论写作": "writing",
    "评论文章": "writing",
    "演讲致辞": "writing",
    "写作题": "writing",
    "写作任务": "writing",
    "海报写作": "writing",
    "演讲辞写作": "writing",
    "通知写作": "writing",
    "演讲词写作": "writing",
    "分析报告": "writing",
    "说明性段落写作": "writing",
    "指南写作": "writing",
    "提案写作": "writing",
    "提案大纲": "writing",
    "专题文章": "writing",
    "论坛帖子": "writing",
    "杂志投稿": "writing",
    "讲解稿": "writing",
    "批判性分析写作": "writing",
    "综合分析题": "writing",
    "概要写作（批判性分析）": "writing",
    "听力理解": "listening",
}

# 应用文写作的各种变体也归入 writing
_APPWRITE_PREFIXES = ["应用文写作"]

DIFFICULTY_MAP = {"基础": 1, "中等": 2, "较难": 3, "拔高": 4}


def _map_section(question_type: str) -> str | None:
    """将 question_type 映射到 section。"""
    if question_type in QUESTION_TYPE_TO_SECTION:
        return QUESTION_TYPE_TO_SECTION[question_type]
    for prefix in _APPWRITE_PREFIXES:
        if question_type.startswith(prefix):
            return "writing"
    return None


def _extract_category(topic: str) -> str:
    """从 topic 提取 category（取括号前的部分）。"""
    for sep in ["（", "(", "："]:
        if sep in topic:
            return topic.split(sep)[0].strip()
    return topic.strip()


def _load_records() -> list[dict]:
    """读取所有 edu_distill 高中英语 validated 数据。"""
    records = []
    for path in DATA_FILES:
        if not path.exists():
            print(f"⚠ 文件不存在: {path}")
            continue
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                records.append(json.loads(line))
    return records


def _build_knowledge_points(records: list[dict]) -> list[dict]:
    """从记录中提取 unique (section, topic) 组合，生成知识点列表。"""
    # 收集 (section, topic) → difficulty 列表
    combo_diffs: dict[tuple[str, str], list[str]] = {}
    combo_counts: Counter = Counter()

    for rec in records:
        meta = rec.get("metadata", {})
        qt = meta.get("question_type", "")
        topic = meta.get("topic", "")
        diff = meta.get("difficulty", "中等")

        section = _map_section(qt)
        if not section or not topic:
            continue

        key = (section, topic)
        combo_counts[key] += 1
        combo_diffs.setdefault(key, []).append(diff)

    points = []
    for (section, topic), count in combo_counts.most_common():
        # difficulty: 取最常见的难度
        diff_counter = Counter(combo_diffs[(section, topic)])
        most_common_diff = diff_counter.most_common(1)[0][0]
        difficulty = DIFFICULTY_MAP.get(most_common_diff, 2)

        # frequency
        if count >= 30:
            frequency = "high"
        elif count >= 10:
            frequency = "medium"
        else:
            frequency = "low"

        category = _extract_category(topic)

        points.append({
            "exam_type": "gaokao",
            "section": section,
            "category": category,
            "name": topic,
            "description": f"高考英语 - {topic}",
            "difficulty": difficulty,
            "frequency": frequency,
        })

    return points


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # 检查是否已有数据
        result = await db.execute(select(ExamKnowledgePoint).limit(1))
        if result.scalar_one_or_none():
            print("✓ 考试知识点已存在，跳过（如需重新导入请先清空表）")
            await engine.dispose()
            return

        print("正在读取 edu_distill 数据...")
        records = _load_records()
        if not records:
            print("✗ 未找到 edu_distill 数据文件，请检查路径")
            await engine.dispose()
            return

        print(f"  读取到 {len(records)} 条记录")

        points = _build_knowledge_points(records)
        print(f"  提取到 {len(points)} 个知识点")

        for p in points:
            db.add(ExamKnowledgePoint(**p))

        await db.commit()

        # 统计
        from collections import Counter as C
        section_counts = C(p["section"] for p in points)
        print(f"\n✓ 考试知识点导入完成，共 {len(points)} 条")
        for sec, cnt in section_counts.most_common():
            print(f"  {sec}: {cnt}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
