"""CLI 入口：将 edu-distill 的 JSONL 英语题目数据导入数据库。

用法：
    python -m app.utils.data_import_cli /path/to/data/validated/
"""

import asyncio
import sys
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session
from app.utils.data_import import import_jsonl


async def main(data_dir: str):
    root = Path(data_dir)
    if not root.exists():
        print(f"目录不存在: {root}")
        sys.exit(1)

    files = list(root.rglob("*.jsonl"))
    if not files:
        print(f"未找到 JSONL 文件: {root}")
        sys.exit(1)

    print(f"找到 {len(files)} 个 JSONL 文件")
    total = 0
    async with async_session() as db:
        for f in files:
            try:
                count = await import_jsonl(f, db)
                total += count
                print(f"  ✓ {f.relative_to(root)} — {count} 条")
            except Exception as e:
                print(f"  ✗ {f.relative_to(root)} — {e}")
    print(f"\n导入完成，共 {total} 条记录")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python -m app.utils.data_import_cli <data_dir>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
