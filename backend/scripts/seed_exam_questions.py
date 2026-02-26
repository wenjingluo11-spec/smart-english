"""从 edu_distill 高中英语数据导入真实题目。

用法：
    cd backend && python -m scripts.seed_exam_questions
"""

import asyncio
import json
import re
from pathlib import Path
from app.models import Base
from app.models.exam import ExamQuestion, ExamKnowledgePoint
from app.database import engine, async_session
from sqlalchemy import select, func

# 复用知识点脚本的映射和路径
from scripts.seed_exam_knowledge_points import (
    DATA_FILES, _load_records, _map_section, DIFFICULTY_MAP,
)

# 去掉题目开头的难度标记
_DIFFICULTY_TAG_RE = re.compile(r"^\[(?:基础|中等|较难|拔高)\]\s*")

# 提取 <think>...</think> 内容
_THINK_RE = re.compile(r"<think>(.*?)</think>", re.DOTALL)


def _parse_content(user_content: str) -> str:
    """去掉难度标记，返回干净的题目内容。"""
    return _DIFFICULTY_TAG_RE.sub("", user_content).strip()


def _parse_answer_and_explanation(assistant_content: str) -> tuple[str, str]:
    """从 assistant 消息中提取答案和解析。

    Returns: (answer, explanation)
    """
    think_match = _THINK_RE.search(assistant_content)
    explanation = think_match.group(1).strip() if think_match else ""

    # 答案 = <think> 之后的正文部分
    answer = _THINK_RE.sub("", assistant_content).strip()
    return answer, explanation


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # 检查是否已有题目
        result = await db.execute(select(func.count()).select_from(ExamQuestion))
        existing = result.scalar() or 0
        if existing > 0:
            print(f"✓ 考试题库已有 {existing} 道题，跳过（如需重新导入请先清空表）")
            await engine.dispose()
            return

        # 加载知识点映射: (section, topic) → kp.id
        result = await db.execute(select(ExamKnowledgePoint))
        kps = result.scalars().all()
        if not kps:
            print("✗ 请先运行 seed_exam_knowledge_points 导入知识点")
            await engine.dispose()
            return

        kp_map = {}
        for kp in kps:
            kp_map[(kp.section, kp.name)] = kp.id

        print("正在读取 edu_distill 数据...")
        records = _load_records()
        if not records:
            print("✗ 未找到 edu_distill 数据文件")
            await engine.dispose()
            return

        print(f"  读取到 {len(records)} 条记录")

        count = 0
        skipped = 0
        for rec in records:
            meta = rec.get("metadata", {})
            qt = meta.get("question_type", "")
            topic = meta.get("topic", "")
            diff_label = meta.get("difficulty", "中等")

            section = _map_section(qt)
            if not section:
                skipped += 1
                continue

            # 匹配知识点
            kp_id = kp_map.get((section, topic))
            if not kp_id:
                skipped += 1
                continue

            # 解析 conversations
            convs = rec.get("conversations", [])
            user_content = ""
            assistant_content = ""
            for c in convs:
                if c["role"] == "user":
                    user_content = c["content"]
                elif c["role"] == "assistant":
                    assistant_content = c["content"]

            if not user_content or not assistant_content:
                skipped += 1
                continue

            content = _parse_content(user_content)
            answer, explanation = _parse_answer_and_explanation(assistant_content)
            difficulty = DIFFICULTY_MAP.get(diff_label, 2)

            db.add(ExamQuestion(
                exam_type="gaokao",
                section=section,
                knowledge_point_id=kp_id,
                difficulty=difficulty,
                content=content,
                answer=answer,
                explanation=explanation,
                metadata_json=json.dumps({
                    "source_id": rec.get("id", ""),
                    "question_type": qt,
                    "topic": topic,
                }, ensure_ascii=False),
            ))
            count += 1

        await db.commit()

        # 统计
        from collections import Counter
        # 重新查询统计
        result = await db.execute(
            select(ExamQuestion.section, func.count())
            .group_by(ExamQuestion.section)
        )
        section_counts = {row[0]: row[1] for row in result.all()}

        print(f"\n✓ 考试题库导入完成，共 {count} 道题（跳过 {skipped} 条）")
        for sec, cnt in sorted(section_counts.items(), key=lambda x: -x[1]):
            print(f"  {sec}: {cnt}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
