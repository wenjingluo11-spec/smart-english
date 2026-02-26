"""JSONL 数据导入工具 — 将 edu-distill 的英语题目数据导入数据库。

数据格式：
  {"id": "...", "conversations": [...], "metadata": {...}}
  metadata 包含: subject, grade_level, grade, topic, difficulty, question_type, source_model
  conversations 是 [system, user, assistant] 三轮对话
"""

import ast
import json
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.question import Question


def _parse_field(val):
    """解析可能是字符串形式的 dict/list。"""
    if isinstance(val, str):
        try:
            return ast.literal_eval(val)
        except (ValueError, SyntaxError):
            return val
    return val


DIFFICULTY_MAP = {"基础": 1, "中等": 3, "较难": 4, "拔高": 5, "进阶": 4, "困难": 5}

# question_type 归一化：将 edu-distill 中 1500+ 种变体映射到 ~15 个标准类别
_QTYPE_RULES: list[tuple[list[str], str]] = [
    (["完形填空", "完型填空"], "完形填空"),
    (["阅读理解", "细节理解", "推理判断", "主旨大意", "词义猜测", "获取信息", "理解主旨", "七选五"], "阅读理解"),
    (["听力"], "听力理解"),
    (["写作", "书面表达", "看图写话", "读后续写", "概要写作", "辩论稿", "建议信", "通知",
      "演讲稿", "邀请信", "感谢信", "道歉信", "申请信", "投诉信", "应用文"], "写作表达"),
    (["语法填空", "语法选择", "语法"], "语法填空"),
    (["短文改错", "改错", "纠错", "语篇改错"], "短文改错"),
    (["情景对话", "补全对话", "对话", "情景交际", "口语"], "情景对话"),
    (["词汇辨析", "词汇选择", "词汇识别", "词汇运用", "词汇", "单词", "词义", "词形", "词组", "选词"], "词汇运用"),
    (["句型", "句子", "连词成句", "翻译"], "句型翻译"),
    (["单项选择", "选择题", "选择填空", "单选"], "单项选择"),
    (["填空", "填词"], "填空题"),
    (["判断", "正误"], "判断题"),
    (["长难句"], "长难句分析"),
    (["看图"], "看图题"),
    (["连线", "配对", "匹配"], "匹配题"),
    (["问答", "简答"], "问答题"),
    (["抄写", "书写", "字母"], "书写练习"),
]


def normalize_question_type(raw: str) -> str:
    """将原始 question_type 归一化为标准类别。"""
    raw = raw.strip()
    for keywords, label in _QTYPE_RULES:
        if any(k in raw for k in keywords):
            return label
    return "其他"


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
        meta = _parse_field(data.get("metadata", {}))
        convs = _parse_field(data.get("conversations", []))

        # 只导入英语题目
        if meta.get("subject", "") != "英语":
            continue

        # 从 conversations 提取题目内容和解析
        content = ""
        answer = ""
        for msg in convs:
            if msg["role"] == "user":
                content = msg["content"]
            elif msg["role"] == "assistant":
                answer = msg["content"]

        difficulty_str = meta.get("difficulty", "中等")
        # 处理带后缀的难度值，如 "基础理论" → "基础"
        difficulty = 3
        for key, val in DIFFICULTY_MAP.items():
            if difficulty_str.startswith(key):
                difficulty = val
                break

        question = Question(
            stage=meta.get("grade_level", ""),
            grade=meta.get("grade", ""),
            topic=meta.get("topic", ""),
            difficulty=difficulty,
            question_type=normalize_question_type(meta.get("question_type", "")),
            content=content,
            options_json=None,
            answer=answer,
            explanation="",
            metadata_json=meta,
        )
        db.add(question)
        count += 1

    await db.commit()
    return count
