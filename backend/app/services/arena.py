"""对战竞技场服务 — 对战创建、回合处理、Elo评分。"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.arena import BattleSession, PlayerRating
from app.models.user import User
from app.services.llm import chat_once_json

JUDGE_SYSTEM = """你是英语对战裁判。根据对战模式和双方输入，评判得分。
返回 JSON：
{"p1_score": 0-10, "p2_score": 0-10, "p1_feedback": "评语", "p2_feedback": "评语"}

评分标准：
- word_chain: 词汇难度+正确性+速度
- debate: 论点质量+语法+说服力
- story_relay: 创意+连贯性+语法
- spot_error: 找错准确性+解释质量
- translation: 翻译准确性+流畅度"""

BATTLE_MODES = {
    "word_chain": {"name": "单词接龙", "description": "用上一个单词的最后一个字母开头接新单词", "rounds": 5},
    "debate": {"name": "英语辩论", "description": "就给定话题用英语辩论", "rounds": 3},
    "story_relay": {"name": "故事接力", "description": "轮流用英语续写故事", "rounds": 4},
    "spot_error": {"name": "找错大师", "description": "找出句子中的语法错误", "rounds": 5},
    "translation": {"name": "翻译对决", "description": "比拼中英翻译速度和准确性", "rounds": 5},
}


async def get_or_create_rating(user_id: int, db: AsyncSession) -> PlayerRating:
    result = await db.execute(select(PlayerRating).where(PlayerRating.user_id == user_id))
    rating = result.scalar_one_or_none()
    if not rating:
        rating = PlayerRating(user_id=user_id)
        db.add(rating)
        await db.flush()
    return rating


async def create_battle(mode: str, player1_id: int, db: AsyncSession) -> dict:
    """创建对战（等待匹配或AI对战）。"""
    if mode not in BATTLE_MODES:
        return {"error": "无效的对战模式"}

    battle = BattleSession(
        mode=mode, player1_id=player1_id, status="waiting",
        rounds_json={"rounds": [], "current_round": 0, "max_rounds": BATTLE_MODES[mode]["rounds"]},
    )
    db.add(battle)
    await db.flush()
    return _format_battle(battle)


async def process_round(battle_id: int, user_id: int, user_input: str, db: AsyncSession) -> dict:
    """处理对战回合。"""
    result = await db.execute(select(BattleSession).where(BattleSession.id == battle_id))
    battle = result.scalar_one_or_none()
    if not battle:
        return {"error": "对战不存在"}

    rounds_data = battle.rounds_json or {"rounds": [], "current_round": 0, "max_rounds": 5}
    rounds = rounds_data.get("rounds", [])
    current = rounds_data.get("current_round", 0)
    max_rounds = rounds_data.get("max_rounds", 5)

    # Generate AI opponent response
    ai_input = await _generate_ai_response(battle.mode, rounds, user_input)

    # Judge the round
    try:
        judge_prompt = (
            f"对战模式：{battle.mode}\n回合 {current + 1}\n"
            f"玩家1输入：{user_input}\n玩家2(AI)输入：{ai_input}"
        )
        scores = await chat_once_json(JUDGE_SYSTEM, judge_prompt)
    except Exception:
        scores = {"p1_score": 5, "p2_score": 5, "p1_feedback": "", "p2_feedback": ""}

    round_result = {
        "round": current + 1,
        "p1_input": user_input, "p2_input": ai_input,
        "p1_score": scores.get("p1_score", 5), "p2_score": scores.get("p2_score", 5),
        "p1_feedback": scores.get("p1_feedback", ""), "p2_feedback": scores.get("p2_feedback", ""),
    }
    rounds.append(round_result)
    rounds_data["rounds"] = rounds
    rounds_data["current_round"] = current + 1

    battle.rounds_json = rounds_data

    # Check if battle is over
    if current + 1 >= max_rounds:
        p1_total = sum(r.get("p1_score", 0) for r in rounds)
        p2_total = sum(r.get("p2_score", 0) for r in rounds)
        battle.status = "finished"
        battle.winner_id = battle.player1_id if p1_total >= p2_total else None

        # Update ratings
        await _update_ratings(battle.player1_id, p1_total > p2_total, db)

    await db.flush()
    return {**_format_battle(battle), "round_result": round_result}


async def _generate_ai_response(mode: str, prev_rounds: list, user_input: str) -> str:
    """生成AI对手的回应。"""
    try:
        system = f"你是英语对战AI对手。模式：{mode}。请用英语回应，水平适中。只返回你的回应文本，不要JSON。"
        context = "\n".join([f"Round {r['round']}: P1={r['p1_input']}, P2={r['p2_input']}" for r in prev_rounds[-3:]])
        prompt = f"之前回合：\n{context}\n\n对手刚说：{user_input}\n\n请回应："
        from app.services.llm import chat_once
        return await chat_once([{"role": "user", "content": prompt}], system)
    except Exception:
        return "I think that's an interesting point."


async def _update_ratings(user_id: int, won: bool, db: AsyncSession):
    """Elo评分更新。"""
    rating = await get_or_create_rating(user_id, db)
    K = 32
    # Against AI baseline of 1000
    expected = 1 / (1 + 10 ** ((1000 - rating.rating) / 400))
    actual = 1.0 if won else 0.0
    rating.rating = max(100, round(rating.rating + K * (actual - expected)))

    if won:
        rating.wins += 1
    else:
        rating.losses += 1

    # Update tier
    r = rating.rating
    if r >= 2000: rating.tier = "champion"
    elif r >= 1600: rating.tier = "diamond"
    elif r >= 1300: rating.tier = "gold"
    elif r >= 1100: rating.tier = "silver"
    else: rating.tier = "bronze"


def calculate_tier(rating: int) -> str:
    if rating >= 2000: return "champion"
    if rating >= 1600: return "diamond"
    if rating >= 1300: return "gold"
    if rating >= 1100: return "silver"
    return "bronze"


async def get_leaderboard(db: AsyncSession, limit: int = 20) -> list[dict]:
    result = await db.execute(
        select(PlayerRating, User.phone)
        .join(User, PlayerRating.user_id == User.id)
        .order_by(PlayerRating.rating.desc())
        .limit(limit)
    )
    return [
        {"user_id": r.user_id, "phone": phone[:3] + "****" + phone[-4:] if len(phone) >= 7 else phone,
         "rating": r.rating, "tier": r.tier, "wins": r.wins}
        for r, phone in result.all()
    ]


async def get_battle_history(user_id: int, db: AsyncSession, limit: int = 20) -> list[dict]:
    result = await db.execute(
        select(BattleSession)
        .where((BattleSession.player1_id == user_id) | (BattleSession.player2_id == user_id))
        .order_by(BattleSession.created_at.desc())
        .limit(limit)
    )
    return [_format_battle(b) for b in result.scalars().all()]


def _format_battle(battle: BattleSession) -> dict:
    return {
        "id": battle.id, "mode": battle.mode,
        "player1_id": battle.player1_id, "player2_id": battle.player2_id,
        "status": battle.status, "rounds": battle.rounds_json,
        "winner_id": battle.winner_id,
        "created_at": battle.created_at.isoformat() if battle.created_at else "",
    }
