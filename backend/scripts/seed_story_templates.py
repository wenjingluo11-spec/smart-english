"""种子数据：故事模板。"""

import asyncio
from app.models import Base
from app.models.story import StoryTemplate
from app.database import engine, async_session

TEMPLATES = [
    {
        "title": "The Mystery of Room 404",
        "genre": "mystery",
        "cefr_min": "A2", "cefr_max": "B1",
        "synopsis": "你是一名新转学生，发现学校图书馆的404号房间隐藏着一个秘密。每晚都有奇怪的声音传出，你决定调查真相。",
        "cover_emoji": "🔍",
        "opening_prompt": "Write the opening chapter of a mystery story set in a school. A new transfer student discovers that Room 404 in the library has strange sounds at night. Set up the mystery and introduce 2-3 characters. End with a cliffhanger and give 2-3 choices.",
    },
    {
        "title": "Lost in Tokyo",
        "genre": "campus",
        "cefr_min": "A2", "cefr_max": "B2",
        "synopsis": "你在东京交换留学的第一天就迷路了，手机没电，只能用英语和当地人交流。一段奇妙的城市冒险就此展开。",
        "cover_emoji": "🗼",
        "opening_prompt": "Write the opening chapter about a Chinese exchange student who gets lost in Tokyo on their first day. Their phone is dead and they must communicate in English. Include interactions with locals and cultural discoveries. Provide choices for where to go next.",
    },
    {
        "title": "The Time Traveler's Dictionary",
        "genre": "scifi",
        "cefr_min": "B1", "cefr_max": "B2",
        "synopsis": "你在旧书店发现了一本神奇的英语词典——每当你学会一个新单词，就会被传送到与该单词相关的历史时期。",
        "cover_emoji": "⏰",
        "opening_prompt": "Write the opening chapter of a sci-fi story where a student finds a magical English dictionary in an old bookshop. When they learn a new word, they are transported to a historical period related to that word. Start with the discovery and first time travel. Include vocabulary learning naturally.",
    },
    {
        "title": "Dragon's English Academy",
        "genre": "fantasy",
        "cefr_min": "A1", "cefr_max": "B1",
        "synopsis": "在一个魔法世界里，龙族开办了一所英语学院。你是第一个被录取的人类学生，必须通过英语考验才能毕业。",
        "cover_emoji": "🐉",
        "opening_prompt": "Write the opening chapter of a fantasy story about a human student accepted into Dragon's English Academy. The dragons teach English through magical challenges. Introduce the academy, a dragon teacher, and a fellow student. Keep language simple for beginners.",
    },
    {
        "title": "The Café Detective",
        "genre": "detective",
        "cefr_min": "B1", "cefr_max": "C1",
        "synopsis": "你是一家国际咖啡馆的服务员，同时也是一名业余侦探。当一位常客神秘失踪后，你开始了调查。",
        "cover_emoji": "☕",
        "opening_prompt": "Write the opening chapter of a detective story set in an international café. The protagonist is a waiter who is also an amateur detective. A regular customer has mysteriously disappeared. Include dialogue with international customers in English. Set up clues and suspects.",
    },
    {
        "title": "Space Station English",
        "genre": "scifi",
        "cefr_min": "A2", "cefr_max": "B2",
        "synopsis": "2050年，你被选为国际空间站的实习生。站上的工作语言是英语，你必须快速提升英语能力来完成各种太空任务。",
        "cover_emoji": "🚀",
        "opening_prompt": "Write the opening chapter about a Chinese intern arriving at the International Space Station in 2050. All communication is in English. Introduce the crew, the station environment, and the first task. Include technical vocabulary explained naturally.",
    },
    {
        "title": "The Secret Garden Club",
        "genre": "campus",
        "cefr_min": "A1", "cefr_max": "A2",
        "synopsis": "你发现学校后面有一个秘密花园，里面的植物标签都是英文的。一群同学组成了秘密花园俱乐部，用英语交流园艺知识。",
        "cover_emoji": "🌸",
        "opening_prompt": "Write a simple opening chapter about students discovering a secret garden behind their school. All plant labels are in English. They form a secret club to take care of the garden. Use very simple English suitable for beginners. Include nature vocabulary.",
    },
    {
        "title": "World Food Challenge",
        "genre": "campus",
        "cefr_min": "A2", "cefr_max": "B1",
        "synopsis": "学校举办国际美食大赛，你和来自不同国家的同学组队参赛。你们必须用英语沟通，一起研发创意菜品。",
        "cover_emoji": "🍳",
        "opening_prompt": "Write the opening chapter about an international food competition at school. The protagonist teams up with students from different countries. They must communicate in English to create fusion dishes. Include food vocabulary and cultural exchange moments.",
    },
]


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        from sqlalchemy import select, func
        result = await db.execute(select(func.count()).select_from(StoryTemplate))
        if result.scalar() > 0:
            print("故事模板已存在，跳过")
            return

        for t in TEMPLATES:
            db.add(StoryTemplate(**t))
        await db.commit()
        print(f"✓ 已导入 {len(TEMPLATES)} 个故事模板")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
