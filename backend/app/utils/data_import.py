"""JSONL 数据导入工具 — 将 edu-distill 的英语题目数据导入数据库。"""

import json
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.question import Question


async def import_jsonl(file_path: str | Path, db: AsyncSession) -> int:
    """导入一个 JSONL 文件中的题目数据，返回导入条数。"""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"文件不存在: {path}")

    count = 0
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        data = json.loads(line)
        question = Question(
            stage=data.get("stage", ""),
            grade=data.get("grade", ""),
            topic=data.get("topic", ""),
            difficulty=data.get("difficulty", 3),
            question_type=data.get("question_type", ""),
            content=data.get("content", ""),
            options_json=data.get("options"),
            answer=data.get("answer", ""),
            explanation=data.get("explanation", ""),
            metadata_json=data.get("metadata"),
        )
        db.add(question)
        count += 1

    await db.commit()
    return count
