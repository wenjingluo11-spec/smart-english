"""知识图谱服务 — 星系视图、节点探索、LLM扩展。"""

import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.knowledge import KnowledgeNode, KnowledgeEdge, UserNodeStatus
from app.services.llm import chat_once_json

EXPAND_SYSTEM = """你是一位英语词汇专家。给定一个英语单词，生成它的关联词网络。
返回 JSON：
{
  "related": [
    {"word": "关联词", "pos": "词性", "definition": "中文释义", "definition_en": "English definition", "relation": "synonym|antonym|family|collocation|derived", "cefr_level": "A1-C2", "example": "例句"}
  ]
}
请生成 5-8 个关联词，包含同义词、反义词、词族、搭配等多种关系。"""


async def get_galaxy_view(user_id: int, db: AsyncSession, limit: int = 50, offset: int = 0) -> dict:
    """获取用户知识图谱子图。"""
    # Get nodes with user status
    result = await db.execute(
        select(KnowledgeNode).order_by(KnowledgeNode.frequency_rank.asc().nullslast()).offset(offset).limit(limit)
    )
    nodes = result.scalars().all()
    node_ids = [n.id for n in nodes]

    # Get user statuses
    status_map = {}
    if node_ids:
        result = await db.execute(
            select(UserNodeStatus).where(UserNodeStatus.user_id == user_id, UserNodeStatus.node_id.in_(node_ids))
        )
        for s in result.scalars().all():
            status_map[s.node_id] = s.status

    # Get edges between these nodes
    edges = []
    if node_ids:
        result = await db.execute(
            select(KnowledgeEdge).where(
                KnowledgeEdge.source_node_id.in_(node_ids),
                KnowledgeEdge.target_node_id.in_(node_ids),
            )
        )
        word_map = {n.id: n.word for n in nodes}
        for e in result.scalars().all():
            edges.append({
                "source_id": e.source_node_id, "target_id": e.target_node_id,
                "source_word": word_map.get(e.source_node_id, ""),
                "target_word": word_map.get(e.target_node_id, ""),
                "relation_type": e.relation_type, "weight": e.weight,
            })

    # Stats
    total_result = await db.execute(select(func.count()).select_from(KnowledgeNode))
    total_nodes = total_result.scalar() or 0
    mastered_result = await db.execute(
        select(func.count()).select_from(UserNodeStatus)
        .where(UserNodeStatus.user_id == user_id, UserNodeStatus.status == "mastered")
    )
    mastered_count = mastered_result.scalar() or 0
    seen_result = await db.execute(
        select(func.count()).select_from(UserNodeStatus)
        .where(UserNodeStatus.user_id == user_id, UserNodeStatus.status.in_(["seen", "familiar", "mastered"]))
    )
    seen_count = seen_result.scalar() or 0

    return {
        "nodes": [
            {
                "id": n.id, "word": n.word, "pos": n.pos, "definition": n.definition,
                "definition_en": n.definition_en, "cefr_level": n.cefr_level,
                "frequency_rank": n.frequency_rank, "example_sentence": n.example_sentence,
                "status": status_map.get(n.id, "undiscovered"),
            }
            for n in nodes
        ],
        "edges": edges,
        "total_nodes": total_nodes,
        "mastered_count": mastered_count,
        "seen_count": seen_count,
    }


async def get_node_detail(node_id: int, user_id: int, db: AsyncSession) -> dict:
    """获取节点详情及关联词。"""
    result = await db.execute(select(KnowledgeNode).where(KnowledgeNode.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        return {"error": "节点不存在"}

    # Get user status
    result = await db.execute(
        select(UserNodeStatus).where(UserNodeStatus.user_id == user_id, UserNodeStatus.node_id == node_id)
    )
    status = result.scalar_one_or_none()

    # Get related nodes via edges
    result = await db.execute(
        select(KnowledgeEdge).where(
            (KnowledgeEdge.source_node_id == node_id) | (KnowledgeEdge.target_node_id == node_id)
        )
    )
    edge_rows = result.scalars().all()
    related_ids = set()
    edges = []
    for e in edge_rows:
        other_id = e.target_node_id if e.source_node_id == node_id else e.source_node_id
        related_ids.add(other_id)
        edges.append({"source_id": e.source_node_id, "target_id": e.target_node_id, "relation_type": e.relation_type, "weight": e.weight})

    related_nodes = []
    if related_ids:
        result = await db.execute(select(KnowledgeNode).where(KnowledgeNode.id.in_(related_ids)))
        related_nodes = [
            {"id": n.id, "word": n.word, "pos": n.pos, "definition": n.definition, "cefr_level": n.cefr_level}
            for n in result.scalars().all()
        ]

    # Mark as seen
    await update_node_status(user_id, node_id, "seen", db)

    return {
        "node": {
            "id": node.id, "word": node.word, "pos": node.pos, "definition": node.definition,
            "definition_en": node.definition_en, "cefr_level": node.cefr_level,
            "frequency_rank": node.frequency_rank, "example_sentence": node.example_sentence,
            "status": status.status if status else "seen",
        },
        "related": related_nodes,
        "edges": edges,
    }


async def expand_node(node_id: int, user_id: int, db: AsyncSession) -> dict:
    """LLM 扩展节点关联词。"""
    result = await db.execute(select(KnowledgeNode).where(KnowledgeNode.id == node_id))
    node = result.scalar_one_or_none()
    if not node:
        return {"error": "节点不存在"}

    user_prompt = f"单词：{node.word} ({node.pos})\n释义：{node.definition}\nCEFR等级：{node.cefr_level}"

    try:
        data = await chat_once_json(EXPAND_SYSTEM, user_prompt)
    except Exception:
        return {"new_nodes": [], "new_edges": []}

    new_nodes = []
    new_edges = []
    for item in data.get("related", []):
        word = item.get("word", "").strip().lower()
        if not word:
            continue

        # Check if node exists
        result = await db.execute(select(KnowledgeNode).where(KnowledgeNode.word == word))
        existing = result.scalar_one_or_none()
        if existing:
            target_id = existing.id
        else:
            new_node = KnowledgeNode(
                word=word, pos=item.get("pos", ""),
                definition=item.get("definition", ""), definition_en=item.get("definition_en"),
                cefr_level=item.get("cefr_level", "A1"), example_sentence=item.get("example"),
            )
            db.add(new_node)
            await db.flush()
            target_id = new_node.id
            new_nodes.append({"id": new_node.id, "word": word, "pos": new_node.pos, "definition": new_node.definition, "cefr_level": new_node.cefr_level})

        # Check if edge exists
        relation = item.get("relation", "collocation")
        result = await db.execute(
            select(KnowledgeEdge).where(
                KnowledgeEdge.source_node_id == node_id, KnowledgeEdge.target_node_id == target_id
            )
        )
        if not result.scalar_one_or_none():
            edge = KnowledgeEdge(source_node_id=node_id, target_node_id=target_id, relation_type=relation)
            db.add(edge)
            new_edges.append({"source_id": node_id, "target_id": target_id, "relation_type": relation})

    await db.flush()
    return {"new_nodes": new_nodes, "new_edges": new_edges}


async def update_node_status(user_id: int, node_id: int, new_status: str, db: AsyncSession):
    """更新用户节点学习状态。"""
    result = await db.execute(
        select(UserNodeStatus).where(UserNodeStatus.user_id == user_id, UserNodeStatus.node_id == node_id)
    )
    status = result.scalar_one_or_none()
    now = datetime.datetime.now(datetime.timezone.utc)

    if status:
        # Only upgrade status, never downgrade
        order = {"undiscovered": 0, "seen": 1, "familiar": 2, "mastered": 3}
        if order.get(new_status, 0) > order.get(status.status, 0):
            status.status = new_status
        status.encounter_count += 1
        status.last_seen = now
    else:
        status = UserNodeStatus(user_id=user_id, node_id=node_id, status=new_status, encounter_count=1, last_seen=now)
        db.add(status)

    await db.flush()


async def get_galaxy_stats(user_id: int, db: AsyncSession) -> dict:
    """获取图谱统计。"""
    total_result = await db.execute(select(func.count()).select_from(KnowledgeNode))
    total = total_result.scalar() or 0

    status_counts = {}
    for s in ["seen", "familiar", "mastered"]:
        r = await db.execute(
            select(func.count()).select_from(UserNodeStatus)
            .where(UserNodeStatus.user_id == user_id, UserNodeStatus.status == s)
        )
        status_counts[s] = r.scalar() or 0

    return {
        "total_nodes": total,
        "undiscovered": total - sum(status_counts.values()),
        **status_counts,
        "progress_pct": round(status_counts.get("mastered", 0) / max(total, 1) * 100, 1),
    }
