"""种子数据：知识图谱核心词汇 + 关系网络。"""

import asyncio
from app.models import Base
from app.models.knowledge import KnowledgeNode, KnowledgeEdge
from app.database import engine, async_session

# Core vocabulary nodes (word, pos, definition, cefr, freq_rank, example)
NODES = [
    ("hello", "intj", "你好", "A1", 500, "Hello, how are you?"),
    ("goodbye", "intj", "再见", "A1", 800, "Goodbye, see you tomorrow!"),
    ("thank", "verb", "感谢", "A1", 300, "Thank you for your help."),
    ("please", "adv", "请", "A1", 400, "Please sit down."),
    ("sorry", "adj", "抱歉的", "A1", 600, "I'm sorry for being late."),
    ("happy", "adj", "快乐的", "A1", 700, "I feel happy today."),
    ("sad", "adj", "悲伤的", "A1", 900, "She looks sad."),
    ("good", "adj", "好的", "A1", 100, "This is a good book."),
    ("bad", "adj", "坏的", "A1", 400, "That's a bad idea."),
    ("big", "adj", "大的", "A1", 200, "It's a big house."),
    ("small", "adj", "小的", "A1", 300, "A small cat sat on the mat."),
    ("eat", "verb", "吃", "A1", 250, "I eat breakfast at 7."),
    ("drink", "verb", "喝", "A1", 350, "Do you want to drink water?"),
    ("run", "verb", "跑", "A1", 450, "He runs every morning."),
    ("walk", "verb", "走", "A1", 500, "Let's walk to school."),
    ("read", "verb", "阅读", "A1", 350, "I like to read books."),
    ("write", "verb", "写", "A1", 400, "Please write your name."),
    ("speak", "verb", "说", "A1", 500, "Can you speak English?"),
    ("listen", "verb", "听", "A1", 550, "Listen to the teacher."),
    ("learn", "verb", "学习", "A1", 450, "I want to learn English."),
    ("beautiful", "adj", "美丽的", "A2", 600, "What a beautiful day!"),
    ("important", "adj", "重要的", "A2", 300, "This is very important."),
    ("difficult", "adj", "困难的", "A2", 700, "The test was difficult."),
    ("easy", "adj", "容易的", "A2", 650, "This question is easy."),
    ("interesting", "adj", "有趣的", "A2", 800, "The movie was interesting."),
    ("boring", "adj", "无聊的", "A2", 1200, "The lecture was boring."),
    ("remember", "verb", "记住", "A2", 500, "Remember to bring your book."),
    ("forget", "verb", "忘记", "A2", 600, "Don't forget your homework."),
    ("understand", "verb", "理解", "A2", 400, "I understand the question."),
    ("explain", "verb", "解释", "A2", 700, "Can you explain this word?"),
    ("experience", "noun", "经验；经历", "B1", 400, "It was a great experience."),
    ("opportunity", "noun", "机会", "B1", 500, "This is a good opportunity."),
    ("environment", "noun", "环境", "B1", 600, "We should protect the environment."),
    ("communicate", "verb", "交流", "B1", 700, "We communicate in English."),
    ("improve", "verb", "提高", "B1", 550, "I want to improve my English."),
    ("achieve", "verb", "达成", "B1", 800, "She achieved her goal."),
    ("challenge", "noun", "挑战", "B1", 650, "Learning English is a challenge."),
    ("confident", "adj", "自信的", "B1", 900, "She is confident in speaking."),
    ("creative", "adj", "有创造力的", "B1", 1000, "He has creative ideas."),
    ("independent", "adj", "独立的", "B1", 1100, "She is very independent."),
    ("consequence", "noun", "后果", "B2", 800, "Every action has consequences."),
    ("significant", "adj", "重要的；显著的", "B2", 500, "A significant improvement."),
    ("perspective", "noun", "视角；观点", "B2", 700, "From a different perspective."),
    ("inevitable", "adj", "不可避免的", "B2", 1200, "Change is inevitable."),
    ("comprehensive", "adj", "全面的", "B2", 900, "A comprehensive review."),
    ("ambiguous", "adj", "模糊的", "C1", 1500, "The statement is ambiguous."),
    ("eloquent", "adj", "雄辩的", "C1", 2000, "An eloquent speech."),
    ("pragmatic", "adj", "务实的", "C1", 1800, "A pragmatic approach."),
    ("ubiquitous", "adj", "无处不在的", "C2", 2500, "Smartphones are ubiquitous."),
    ("ephemeral", "adj", "短暂的", "C2", 3000, "Fame can be ephemeral."),
]

# Edges: (source_word, target_word, relation_type)
EDGES = [
    ("happy", "sad", "antonym"), ("good", "bad", "antonym"), ("big", "small", "antonym"),
    ("difficult", "easy", "antonym"), ("interesting", "boring", "antonym"),
    ("remember", "forget", "antonym"),
    ("happy", "good", "collocation"), ("beautiful", "good", "synonym"),
    ("speak", "listen", "collocation"), ("read", "write", "collocation"),
    ("eat", "drink", "collocation"), ("run", "walk", "family"),
    ("learn", "understand", "collocation"), ("learn", "read", "collocation"),
    ("learn", "write", "collocation"), ("learn", "listen", "collocation"),
    ("learn", "speak", "collocation"), ("learn", "remember", "collocation"),
    ("explain", "understand", "collocation"), ("difficult", "challenge", "collocation"),
    ("improve", "learn", "collocation"), ("improve", "achieve", "collocation"),
    ("confident", "independent", "collocation"), ("creative", "interesting", "collocation"),
    ("communicate", "speak", "family"), ("communicate", "listen", "collocation"),
    ("experience", "learn", "collocation"), ("opportunity", "achieve", "collocation"),
    ("important", "significant", "synonym"), ("environment", "important", "collocation"),
    ("consequence", "important", "collocation"), ("perspective", "understand", "collocation"),
    ("comprehensive", "important", "collocation"), ("inevitable", "consequence", "collocation"),
    ("ambiguous", "explain", "collocation"), ("eloquent", "speak", "family"),
    ("pragmatic", "important", "collocation"), ("ubiquitous", "environment", "collocation"),
    ("ephemeral", "important", "collocation"),
    ("hello", "goodbye", "antonym"), ("thank", "please", "collocation"),
]


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        from sqlalchemy import select, func
        result = await db.execute(select(func.count()).select_from(KnowledgeNode))
        if result.scalar() > 0:
            print("知识图谱数据已存在，跳过")
            return

        # Insert nodes
        word_to_id = {}
        for word, pos, defn, cefr, freq, example in NODES:
            node = KnowledgeNode(
                word=word, pos=pos, definition=defn,
                cefr_level=cefr, frequency_rank=freq, example_sentence=example,
            )
            db.add(node)
            await db.flush()
            word_to_id[word] = node.id

        # Insert edges
        edge_count = 0
        for src, tgt, rel in EDGES:
            if src in word_to_id and tgt in word_to_id:
                db.add(KnowledgeEdge(
                    source_node_id=word_to_id[src],
                    target_node_id=word_to_id[tgt],
                    relation_type=rel,
                ))
                edge_count += 1

        await db.commit()
        print(f"✓ 已导入 {len(NODES)} 个词汇节点, {edge_count} 条关系边")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
