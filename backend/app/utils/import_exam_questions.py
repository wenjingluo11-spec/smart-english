"""从 edu-distill JSONL 导入真题到 exam_questions 表。

用法：
    cd backend && source .venv/bin/activate
    python -m app.utils.import_exam_questions [--data-dir /path/to/validated/高中/英语]

数据来源：edu-distill/data/validated/高中/英语/{高二,高三}.jsonl
每条 JSONL 包含 conversations(system/user/assistant) + metadata(question_type/difficulty/topic)。
同一 topic 下的阅读理解/完形填空题共享 passage_group，模考组卷时按 group 整组选取。
"""

import asyncio
import json
import re
import sys
from pathlib import Path
from collections import defaultdict

from sqlalchemy import select, func

from app.models import Base
from app.models.user import User  # noqa: F401
from app.models.question import Question  # noqa: F401
from app.models.exam import ExamQuestion
from app.database import engine, async_session

# ── question_type → section 映射 ──

TYPE_TO_SECTION: dict[str, str] = {
    "语法填空": "grammar_fill",
    "单词拼写": "grammar_fill",
    "长难句分析": "grammar_fill",
    "句子翻译": "grammar_fill",
    "单项选择": "grammar_fill",
    "单项选择题": "grammar_fill",
    "句子改写": "grammar_fill",
    "句型转换": "grammar_fill",
    "句式转换": "grammar_fill",
    "句型改写": "grammar_fill",
    "改写句子": "grammar_fill",
    "对话填空": "grammar_fill",
    "综合填空": "grammar_fill",
    "语境填空": "grammar_fill",
    "词义辨析": "grammar_fill",
    "词汇辨析": "grammar_fill",
    "词汇运用": "grammar_fill",
    "词汇运用题": "grammar_fill",
    "词形转换": "grammar_fill",
    "语法分析": "grammar_fill",
    "语法辨析": "grammar_fill",
    "语法识别": "grammar_fill",
    "语法对比分析": "grammar_fill",
    "修辞改写": "grammar_fill",
    "修辞分析": "grammar_fill",
    "情景完成": "grammar_fill",
    "情景应用": "grammar_fill",
    "句子分析": "grammar_fill",
    "对比分析": "grammar_fill",
    "阅读理解": "reading",
    "七选五": "reading",
    "推理判断": "reading",
    "完形填空": "cloze",
    "写作": "writing",
    "应用文写作": "writing",
    "读后续写": "writing",
    "概要写作": "writing",
    "辩论稿": "writing",
    "建议信": "writing",
    "通知": "writing",
    "新闻报道": "writing",
    "电子邮件": "writing",
    "演讲词": "writing",
    "演讲稿": "writing",
    "发言稿": "writing",
    "征文": "writing",
    "海报写作": "writing",
    "通知写作": "writing",
    "议论文": "writing",
    "改错题": "error_correction",
    "短文改错": "error_correction",
    "综合改错": "error_correction",
    "语法改错": "error_correction",
    "改错": "error_correction",
}

DIFFICULTY_MAP = {"基础": 2, "中等": 3, "较难": 4, "拔高": 5}

# 需要按篇章分组的 section
PASSAGE_SECTIONS = {"reading", "cloze"}


def _classify_section(question_type: str) -> str:
    """将 question_type 映射到 section，未知类型尝试模糊匹配。"""
    if question_type in TYPE_TO_SECTION:
        return TYPE_TO_SECTION[question_type]
    # 模糊匹配
    if "写作" in question_type or "写" in question_type:
        return "writing"
    if "改错" in question_type:
        return "error_correction"
    if "阅读" in question_type:
        return "reading"
    if "填空" in question_type:
        return "grammar_fill"
    if "完形" in question_type:
        return "cloze"
    return "grammar_fill"  # fallback


def _extract_answer(assistant_content: str) -> str:
    """从 assistant 回复中提取答案（去掉 <think> 块）。"""
    # Remove <think>...</think>
    cleaned = re.sub(r"<think>.*?</think>", "", assistant_content, flags=re.DOTALL).strip()
    return cleaned


def _extract_passage_and_questions(content: str) -> tuple[str | None, str]:
    """尝试从题目内容中分离篇章和问题。"""
    # 常见的阅读理解格式：先有一段文章，然后是问题
    markers = ["问题：", "Question:", "Questions:", "问题1", "Q1", "1.", "1)"]
    for marker in markers:
        idx = content.find(marker)
        if idx > 100:  # 篇章至少100字符
            return content[:idx].strip(), content[idx:].strip()
    return None, content


def _parse_options(content: str) -> list[str] | None:
    """尝试从内容中提取选项。"""
    # 匹配 A. xxx B. xxx 或 A) xxx B) xxx 格式
    pattern = r'[A-D][.)]\s*[^\n]+'
    matches = re.findall(pattern, content)
    if len(matches) >= 2:
        return matches
    return None


def parse_jsonl(file_path: Path) -> list[dict]:
    """解析 JSONL 文件，返回结构化题目列表。"""
    items = []
    for line in file_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        data = json.loads(line)
        meta = data.get("metadata", {})
        convs = data.get("conversations", [])

        content = ""
        answer_raw = ""
        for msg in convs:
            if msg["role"] == "user":
                content = msg["content"]
            elif msg["role"] == "assistant":
                answer_raw = msg["content"]

        if not content:
            continue

        question_type = meta.get("question_type", "")
        section = _classify_section(question_type)
        difficulty = DIFFICULTY_MAP.get(meta.get("difficulty", "中等"), 3)
        answer = _extract_answer(answer_raw)
        topic = meta.get("topic", "")

        passage_text, question_content = None, content
        if section in PASSAGE_SECTIONS:
            passage_text, question_content = _extract_passage_and_questions(content)

        options = _parse_options(content)

        items.append({
            "source_id": data.get("id", ""),
            "section": section,
            "difficulty": difficulty,
            "topic": topic,
            "content": question_content,
            "passage_text": passage_text,
            "options": options,
            "answer": answer,
            "explanation": answer_raw if answer != answer_raw else "",
            "metadata": meta,
        })
    return items


def assign_passage_groups(items: list[dict]) -> list[dict]:
    """为同一 topic 下的阅读/完形题分配 passage_group。

    策略：同一 topic + section 的题目归为一组。
    每组最多 5 题（阅读理解一篇文章通常 3-5 题）。
    """
    # 按 (section, topic) 分组
    groups: dict[tuple[str, str], list[int]] = defaultdict(list)
    for i, item in enumerate(items):
        if item["section"] in PASSAGE_SECTIONS:
            key = (item["section"], item["topic"])
            groups[key].append(i)

    group_counter = defaultdict(int)
    for (section, topic), indices in groups.items():
        # 每 4 题一组（阅读理解标准）
        chunk_size = 4 if section == "reading" else 5
        for chunk_start in range(0, len(indices), chunk_size):
            chunk = indices[chunk_start:chunk_start + chunk_size]
            group_counter[section] += 1
            group_id = f"{section}_{group_counter[section]:04d}"
            for pos, idx in enumerate(chunk):
                items[idx]["passage_group"] = group_id
                items[idx]["passage_index"] = pos

    # 非篇章题目不设 group
    for item in items:
        if "passage_group" not in item:
            item["passage_group"] = None
            item["passage_index"] = 0

    return items


async def import_exam_questions(data_dir: str | Path) -> int:
    """主导入函数。"""
    data_dir = Path(data_dir)
    files = sorted(data_dir.glob("*.jsonl"))
    if not files:
        print(f"未找到 JSONL 文件: {data_dir}")
        return 0

    # 解析所有文件
    all_items: list[dict] = []
    for f in files:
        items = parse_jsonl(f)
        print(f"  解析 {f.name}: {len(items)} 题")
        all_items.extend(items)

    # 分配 passage_group
    all_items = assign_passage_groups(all_items)

    # 统计
    section_counts = defaultdict(int)
    group_counts = defaultdict(int)
    for item in all_items:
        section_counts[item["section"]] += 1
        if item["passage_group"]:
            group_counts[item["section"]] += 1

    print(f"\n  题型分布:")
    for sec, cnt in sorted(section_counts.items(), key=lambda x: -x[1]):
        g = group_counts.get(sec, 0)
        extra = f" ({g} 题有篇章分组)" if g else ""
        print(f"    {sec}: {cnt}{extra}")

    # 建表 & 写入
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # 检查是否已有数据
        result = await db.execute(
            select(func.count()).select_from(ExamQuestion).where(ExamQuestion.source_id.isnot(None))
        )
        existing = result.scalar() or 0
        if existing > 0:
            print(f"\n  已有 {existing} 条真题数据，跳过导入（如需重新导入请先清空）")
            return 0

        for item in all_items:
            q = ExamQuestion(
                exam_type="gaokao",
                section=item["section"],
                difficulty=item["difficulty"],
                passage_group=item["passage_group"],
                passage_index=item["passage_index"],
                source_id=item["source_id"],
                content=item["content"],
                passage_text=item["passage_text"],
                options_json=json.dumps(item["options"], ensure_ascii=False) if item["options"] else None,
                answer=item["answer"],
                explanation=item["explanation"],
                metadata_json=json.dumps(item["metadata"], ensure_ascii=False),
            )
            db.add(q)

        await db.commit()
        print(f"\n✓ 成功导入 {len(all_items)} 道真题")

    return len(all_items)


async def main():
    data_dir = None
    for i, arg in enumerate(sys.argv):
        if arg == "--data-dir" and i + 1 < len(sys.argv):
            data_dir = sys.argv[i + 1]

    if not data_dir:
        default = Path(__file__).resolve().parent.parent.parent.parent.parent / "edu-distill" / "data" / "validated" / "高中" / "英语"
        if default.exists():
            data_dir = str(default)

    if not data_dir:
        print("用法: python -m app.utils.import_exam_questions [--data-dir /path/to/高中/英语]")
        sys.exit(1)

    print(f"数据目录: {data_dir}")
    total = await import_exam_questions(data_dir)
    print(f"导入完成，共 {total} 题")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
