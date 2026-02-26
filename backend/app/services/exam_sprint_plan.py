"""每日冲刺计划服务 — 智能日程编排。"""

import json
import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.exam import DailySprintPlan, ExamProfile
from app.services.exam_training import get_section_masteries
from app.services.exam_weakness import get_weakness_list
from app.services.llm import chat_once_json


async def get_or_generate_sprint_plan(user_id: int, db: AsyncSession) -> dict:
    """获取今日冲刺计划，不存在则生成。"""
    today = datetime.date.today().isoformat()

    result = await db.execute(
        select(DailySprintPlan).where(
            DailySprintPlan.user_id == user_id, DailySprintPlan.plan_date == today
        )
    )
    plan = result.scalar_one_or_none()
    if plan:
        return _plan_to_dict(plan)

    # 生成新计划
    return await _generate_plan(user_id, today, db)


async def _generate_plan(user_id: int, today: str, db: AsyncSession) -> dict:
    """LLM 生成个性化每日冲刺计划。"""
    # 收集上下文
    profile_result = await db.execute(
        select(ExamProfile).where(ExamProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        return {"error": "请先设置考试档案"}

    exam_date = profile.exam_date
    days_remaining = (datetime.date.fromisoformat(exam_date) - datetime.date.today()).days
    days_remaining = max(0, days_remaining)

    # 获取各题型掌握度
    masteries = await get_section_masteries(user_id, profile.exam_type, db)

    # 获取薄弱点
    weaknesses = await get_weakness_list(user_id, db)
    weak_names = [w["name"] for w in weaknesses[:5]]

    # 判断工作日/周末
    is_weekend = datetime.date.today().weekday() >= 5

    context = {
        "exam_type": "高考" if profile.exam_type == "gaokao" else "中考",
        "target_score": profile.target_score,
        "days_remaining": days_remaining,
        "is_weekend": is_weekend,
        "masteries": [{"section": m["section"], "label": m["label"], "mastery": m["mastery"]} for m in masteries],
        "weak_points": weak_names,
    }

    try:
        result = await chat_once_json(
            system_prompt=(
                "你是一个英语考试冲刺计划师。根据学生的考试信息和当前状态，生成今日冲刺任务清单。\n"
                "规则：\n"
                "- 距考试 <30 天：侧重薄弱项和模考\n"
                "- 距考试 30-60 天：均衡训练各题型\n"
                "- 距考试 >60 天：侧重基础和知识点覆盖\n"
                "- 周末可以安排更多任务\n"
                "- 每个任务包含：类型、描述、预计用时、XP 奖励、推荐理由\n"
                "返回 JSON：{\"tasks\": [{\"type\": \"training/mock/weakness/flow/review\", "
                "\"section\": \"题型（可选）\", \"title\": \"任务标题\", "
                "\"description\": \"一句话描述\", \"estimated_minutes\": 预计分钟数, "
                "\"xp_reward\": XP奖励, \"reason\": \"推荐理由（一句话）\"}], "
                "\"motivation\": \"今日鼓励语（一句话）\"}\n"
                f"工作日安排 4-5 个任务，周末安排 6-7 个任务。"
            ),
            user_prompt=json.dumps(context, ensure_ascii=False),
        )
    except Exception:
        # fallback: 生成默认计划
        result = _default_plan(masteries, days_remaining)

    tasks = result.get("tasks", [])
    motivation = result.get("motivation", "今天也要加油哦！")

    plan = DailySprintPlan(
        user_id=user_id,
        plan_date=today,
        tasks_json=json.dumps(tasks, ensure_ascii=False),
        total_count=len(tasks),
    )
    db.add(plan)
    await db.flush()

    return {
        "id": plan.id,
        "plan_date": today,
        "tasks": tasks,
        "total_count": len(tasks),
        "completed_count": 0,
        "is_completed": False,
        "motivation": motivation,
        "days_remaining": days_remaining,
    }


def _default_plan(masteries: list[dict], days_remaining: int) -> dict:
    """LLM 不可用时的默认计划。"""
    tasks = []
    # 找最弱的题型
    sorted_m = sorted(masteries, key=lambda x: x.get("mastery", 0))

    if sorted_m:
        weakest = sorted_m[0]
        tasks.append({
            "type": "training", "section": weakest["section"],
            "title": f"专项训练：{weakest.get('label', weakest['section'])}",
            "description": "针对最薄弱题型进行强化训练",
            "estimated_minutes": 15, "xp_reward": 25,
            "reason": f"该题型掌握度仅 {int(weakest.get('mastery', 0) * 100)}%",
        })

    tasks.append({
        "type": "flow", "section": "mixed",
        "title": "心流刷题 20 道",
        "description": "沉浸式连击刷题，保持手感",
        "estimated_minutes": 10, "xp_reward": 30,
        "reason": "保持做题节奏和手感",
    })

    if days_remaining < 30:
        tasks.append({
            "type": "mock",
            "title": "全真模考一套",
            "description": "严格计时，模拟真实考场",
            "estimated_minutes": 90, "xp_reward": 50,
            "reason": f"距考试仅 {days_remaining} 天，需要实战演练",
        })

    tasks.append({
        "type": "weakness",
        "title": "突破一个薄弱知识点",
        "description": "微课学习 + 针对练习 + 验证",
        "estimated_minutes": 20, "xp_reward": 40,
        "reason": "消灭薄弱点是提分最快的方式",
    })

    return {"tasks": tasks, "motivation": "每天进步一点点，积少成多！"}


async def complete_sprint_task(
    user_id: int, plan_id: int, task_index: int, db: AsyncSession
) -> dict:
    """标记冲刺任务完成。"""
    result = await db.execute(
        select(DailySprintPlan).where(
            DailySprintPlan.id == plan_id, DailySprintPlan.user_id == user_id
        )
    )
    plan = result.scalar_one_or_none()
    if not plan:
        return {"error": "plan not found"}

    tasks = json.loads(plan.tasks_json or "[]")
    if task_index < 0 or task_index >= len(tasks):
        return {"error": "invalid task index"}

    if tasks[task_index].get("completed"):
        return {"error": "task already completed"}

    tasks[task_index]["completed"] = True
    xp_reward = tasks[task_index].get("xp_reward", 10)
    plan.tasks_json = json.dumps(tasks, ensure_ascii=False)
    plan.completed_count += 1
    plan.xp_earned += xp_reward

    all_done = plan.completed_count >= plan.total_count
    if all_done:
        plan.is_completed = True
        bonus_xp = 20
        plan.xp_earned += bonus_xp
        xp_reward += bonus_xp

    await db.flush()

    return {
        "task_index": task_index,
        "xp_reward": xp_reward,
        "completed_count": plan.completed_count,
        "total_count": plan.total_count,
        "all_done": all_done,
    }
