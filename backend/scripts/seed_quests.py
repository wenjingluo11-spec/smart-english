"""种子数据：真实世界任务模板。"""

import asyncio
from app.models import Base
from app.models.quest import QuestTemplate
from app.database import engine, async_session

QUESTS = [
    # 日常 (difficulty=1)
    {"title": "英文点餐挑战", "description": "在餐厅或外卖App上用英文完成一次点餐，截图记录过程。", "difficulty": 1, "category": "social",
     "requirements_json": {"type": "screenshot", "description": "截图显示英文点餐界面或对话"},
     "tips_json": {"tips": ["可以用 'I would like...' 开头", "记得说 'Could I have the bill, please?'"]}, "xp_reward": 30},
    {"title": "英文歌词翻译", "description": "选一首你喜欢的英文歌，翻译其中一段歌词并截图。", "difficulty": 1, "category": "media",
     "requirements_json": {"type": "screenshot", "description": "截图显示原文歌词和你的翻译"},
     "tips_json": {"tips": ["注意歌词中的俚语和比喻", "可以用翻译App辅助但要自己理解"]}, "xp_reward": 30},
    {"title": "英文日记一则", "description": "用英文写一篇50词以上的日记，记录今天发生的事。", "difficulty": 1, "category": "writing",
     "requirements_json": {"type": "screenshot", "description": "截图显示你写的英文日记"},
     "tips_json": {"tips": ["用过去时描述已发生的事", "可以写 'Today I...' 开头"]}, "xp_reward": 35},
    {"title": "英文App界面截图", "description": "将手机语言切换为英文，截图一个你常用的App界面。", "difficulty": 1, "category": "digital",
     "requirements_json": {"type": "screenshot", "description": "截图显示英文界面的App"},
     "tips_json": {"tips": ["Settings → Language → English", "注意观察菜单项的英文表达"]}, "xp_reward": 25},
    {"title": "英文搜索挑战", "description": "用英文在Google/Bing搜索一个你感兴趣的话题，阅读一段结果。", "difficulty": 1, "category": "digital",
     "requirements_json": {"type": "screenshot", "description": "截图显示英文搜索结果页面"},
     "tips_json": {"tips": ["试试搜索 'how to...' 或 'what is...'", "阅读搜索结果的摘要部分"]}, "xp_reward": 25},
    {"title": "英文天气播报", "description": "用英文描述今天的天气，录制或写下来。", "difficulty": 1, "category": "social",
     "requirements_json": {"type": "screenshot", "description": "截图显示你的英文天气描述"},
     "tips_json": {"tips": ["It's sunny/cloudy/rainy today", "The temperature is about ... degrees"]}, "xp_reward": 25},
    {"title": "英文购物清单", "description": "用英文写一份购物清单（至少10个物品）。", "difficulty": 1, "category": "writing",
     "requirements_json": {"type": "screenshot", "description": "截图显示英文购物清单"},
     "tips_json": {"tips": ["分类写：fruits, vegetables, dairy...", "可以加数量：2 bottles of milk"]}, "xp_reward": 25},

    # 挑战 (difficulty=2)
    {"title": "英文电影评论", "description": "看一部英文电影/剧集，用英文写100词以上的评论。", "difficulty": 2, "category": "media",
     "requirements_json": {"type": "screenshot", "description": "截图显示你的英文影评"},
     "tips_json": {"tips": ["包含 plot summary, characters, your opinion", "用 'I recommend this because...' 结尾"]}, "xp_reward": 50},
    {"title": "英文社交媒体发帖", "description": "在社交媒体上用英文发一条帖子（可以是朋友圈、微博等）。", "difficulty": 2, "category": "social",
     "requirements_json": {"type": "screenshot", "description": "截图显示你发布的英文帖子"},
     "tips_json": {"tips": ["可以分享一张照片配英文描述", "用hashtag增加趣味性"]}, "xp_reward": 45},
    {"title": "英文邮件写作", "description": "用英文写一封正式邮件（可以是给老师、公司等）。", "difficulty": 2, "category": "writing",
     "requirements_json": {"type": "screenshot", "description": "截图显示你写的英文邮件"},
     "tips_json": {"tips": ["开头用 Dear Mr./Ms. ...", "结尾用 Best regards/Sincerely"]}, "xp_reward": 50},
    {"title": "英文新闻摘要", "description": "阅读一篇英文新闻，用自己的话写一段80词以上的摘要。", "difficulty": 2, "category": "media",
     "requirements_json": {"type": "screenshot", "description": "截图显示原文链接和你的摘要"},
     "tips_json": {"tips": ["推荐 BBC Learning English 或 VOA", "摘要包含 who, what, when, where, why"]}, "xp_reward": 50},
    {"title": "英文路线指引", "description": "用英文描述从你家到学校/公司的路线。", "difficulty": 2, "category": "writing",
     "requirements_json": {"type": "screenshot", "description": "截图显示你的英文路线描述"},
     "tips_json": {"tips": ["用 'Go straight', 'Turn left/right', 'Walk past...'", "可以配合地图截图"]}, "xp_reward": 40},
    {"title": "英文产品评价", "description": "在购物网站上用英文写一条产品评价（50词以上）。", "difficulty": 2, "category": "digital",
     "requirements_json": {"type": "screenshot", "description": "截图显示你发布的英文评价"},
     "tips_json": {"tips": ["描述产品优缺点", "用星级评分 + 文字评价"]}, "xp_reward": 45},

    # 史诗 (difficulty=3)
    {"title": "英文演讲稿", "description": "写一篇200词以上的英文演讲稿，主题自选。", "difficulty": 3, "category": "writing",
     "requirements_json": {"type": "screenshot", "description": "截图显示完整的英文演讲稿"},
     "tips_json": {"tips": ["结构：Opening → Body (3 points) → Conclusion", "用修辞手法增加感染力"]}, "xp_reward": 80},
    {"title": "英文视频字幕翻译", "description": "为一段1分钟以上的英文视频写中文字幕翻译。", "difficulty": 3, "category": "media",
     "requirements_json": {"type": "screenshot", "description": "截图显示视频和你的翻译字幕"},
     "tips_json": {"tips": ["注意口语化表达的翻译", "保持字幕简洁"]}, "xp_reward": 80},
    {"title": "英文故事创作", "description": "用英文写一个300词以上的短故事。", "difficulty": 3, "category": "writing",
     "requirements_json": {"type": "screenshot", "description": "截图显示你的英文短故事"},
     "tips_json": {"tips": ["包含 setting, characters, conflict, resolution", "用对话让故事更生动"]}, "xp_reward": 100},
    {"title": "英文采访记录", "description": "用英文采访一位朋友或家人，记录对话内容（至少5个问答）。", "difficulty": 3, "category": "social",
     "requirements_json": {"type": "screenshot", "description": "截图显示英文采访记录"},
     "tips_json": {"tips": ["准备开放式问题", "用 'Could you tell me about...' 提问"]}, "xp_reward": 80},
    {"title": "英文旅行攻略", "description": "用英文写一份你想去的地方的旅行攻略（200词以上）。", "difficulty": 3, "category": "writing",
     "requirements_json": {"type": "screenshot", "description": "截图显示你的英文旅行攻略"},
     "tips_json": {"tips": ["包含 transportation, accommodation, attractions, food", "加入实用短语"]}, "xp_reward": 80},
    {"title": "英文辩论稿", "description": "选一个话题，用英文写正方和反方各100词以上的论点。", "difficulty": 3, "category": "writing",
     "requirements_json": {"type": "screenshot", "description": "截图显示正反方英文论点"},
     "tips_json": {"tips": ["用 'On one hand... On the other hand...'", "每个论点配一个例子"]}, "xp_reward": 80},
]


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        from sqlalchemy import select, func
        result = await db.execute(select(func.count()).select_from(QuestTemplate))
        if result.scalar() > 0:
            print("任务模板已存在，跳过")
            return

        for q in QUESTS:
            db.add(QuestTemplate(**q))
        await db.commit()
        print(f"✓ 已导入 {len(QUESTS)} 个任务模板")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
