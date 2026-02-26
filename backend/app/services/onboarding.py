"""新手引导服务：水平测评 + 学习路径推荐。"""

import json
from app.services.llm import chat_once_json


ASSESSMENT_QUESTIONS = [
    {
        "index": 0, "difficulty": "A1",
        "content": "Choose the correct word: She ___ a student.",
        "options": ["A. am", "B. is", "C. are", "D. be"],
        "answer": "B",
    },
    {
        "index": 1, "difficulty": "A1",
        "content": "What is the plural of 'child'?",
        "options": ["A. childs", "B. childes", "C. children", "D. childrens"],
        "answer": "C",
    },
    {
        "index": 2, "difficulty": "A2",
        "content": "Choose the correct sentence:",
        "options": [
            "A. I have went to school.",
            "B. I have gone to school.",
            "C. I have go to school.",
            "D. I have going to school.",
        ],
        "answer": "B",
    },
    {
        "index": 3, "difficulty": "A2",
        "content": "She asked me ___ I wanted to go.",
        "options": ["A. that", "B. if", "C. what", "D. which"],
        "answer": "B",
    },
    {
        "index": 4, "difficulty": "B1",
        "content": "If I ___ rich, I would travel the world.",
        "options": ["A. am", "B. was", "C. were", "D. be"],
        "answer": "C",
    },
    {
        "index": 5, "difficulty": "B1",
        "content": "The book ___ by millions of people worldwide.",
        "options": ["A. has read", "B. has been read", "C. have been read", "D. was reading"],
        "answer": "B",
    },
    {
        "index": 6, "difficulty": "B1",
        "content": "Choose the word that best completes: Despite the rain, they ___ to finish the game.",
        "options": ["A. managed", "B. succeeded", "C. achieved", "D. accomplished"],
        "answer": "A",
    },
    {
        "index": 7, "difficulty": "B2",
        "content": "Not until the meeting ended ___ the importance of the decision.",
        "options": [
            "A. did I realize",
            "B. I realized",
            "C. I did realize",
            "D. realized I",
        ],
        "answer": "A",
    },
    {
        "index": 8, "difficulty": "B2",
        "content": "The phenomenon ___ scientists have been studying for decades remains unexplained.",
        "options": ["A. what", "B. which", "C. where", "D. who"],
        "answer": "B",
    },
    {
        "index": 9, "difficulty": "C1",
        "content": "Had the government acted sooner, the crisis ___.",
        "options": [
            "A. would have been averted",
            "B. will be averted",
            "C. would avert",
            "D. had been averted",
        ],
        "answer": "A",
    },
]


def generate_assessment_questions() -> list[dict]:
    """返回 10 道分级测评题。"""
    return [
        {
            "index": q["index"],
            "difficulty": q["difficulty"],
            "content": q["content"],
            "options": q["options"],
        }
        for q in ASSESSMENT_QUESTIONS
    ]


def evaluate_assessment(answers: list[dict]) -> dict:
    """评估测评结果，返回分数和 CEFR 等级。"""
    correct = 0
    details = []
    for ans in answers:
        idx = ans.get("question_index", -1)
        if 0 <= idx < len(ASSESSMENT_QUESTIONS):
            q = ASSESSMENT_QUESTIONS[idx]
            is_correct = ans.get("answer", "").strip().upper() == q["answer"]
            if is_correct:
                correct += 1
            details.append({
                "index": idx,
                "difficulty": q["difficulty"],
                "is_correct": is_correct,
            })

    score = round(correct / len(ASSESSMENT_QUESTIONS) * 100)

    # Map score to CEFR
    if score >= 90:
        cefr = "B2"
    elif score >= 70:
        cefr = "B1"
    elif score >= 50:
        cefr = "A2"
    else:
        cefr = "A1"

    return {
        "score": score,
        "correct": correct,
        "total": len(ASSESSMENT_QUESTIONS),
        "cefr_level": cefr,
        "details": details,
    }


def recommend_learning_path(cefr_level: str, target_exam: str | None) -> str:
    """根据 CEFR 等级和目标考试推荐学习路径。"""
    if target_exam == "zhongkao":
        if cefr_level in ("A1", "A2"):
            return "基础巩固 → 教材同步 → 语法专项 → 中考真题"
        return "教材同步 → 中考真题 → 薄弱专项突破"
    elif target_exam == "gaokao":
        if cefr_level in ("A1", "A2"):
            return "基础补强 → 词汇扩展 → 语法体系 → 阅读提升"
        if cefr_level == "B1":
            return "词汇深化 → 阅读写作 → 高考真题 → 薄弱突破"
        return "高考真题 → 写作提升 → 难点攻克"
    else:
        if cefr_level in ("A1", "A2"):
            return "基础词汇 → 语法入门 → 简单阅读 → 日常对话"
        return "词汇扩展 → 阅读训练 → 写作练习 → 综合提升"
