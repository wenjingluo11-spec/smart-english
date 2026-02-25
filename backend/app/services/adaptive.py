"""自适应学习引擎 — 简单的能力评估 + 推题逻辑骨架。"""


def estimate_ability(correct: int, total: int) -> float:
    """简单能力估计 (0-100)，后续替换为 IRT 模型。"""
    if total == 0:
        return 50.0
    return round((correct / total) * 100, 1)


def recommend_difficulty(ability: float, recent_streak: int) -> int:
    """根据能力值和连续答对/答错数推荐难度 (1-5)。"""
    base = max(1, min(5, round(ability / 20)))
    if recent_streak >= 3:
        base = min(5, base + 1)
    elif recent_streak <= -3:
        base = max(1, base - 1)
    return base
