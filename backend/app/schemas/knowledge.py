from pydantic import BaseModel


class KnowledgeNodeOut(BaseModel):
    id: int
    word: str
    pos: str
    definition: str
    definition_en: str | None = None
    cefr_level: str
    frequency_rank: int | None = None
    example_sentence: str | None = None
    status: str = "undiscovered"  # from UserNodeStatus


class KnowledgeEdgeOut(BaseModel):
    source_id: int
    target_id: int
    source_word: str = ""
    target_word: str = ""
    relation_type: str
    weight: float = 1.0


class GalaxyViewResponse(BaseModel):
    nodes: list[KnowledgeNodeOut]
    edges: list[KnowledgeEdgeOut]
    total_nodes: int
    mastered_count: int
    seen_count: int


class NodeDetailResponse(BaseModel):
    node: KnowledgeNodeOut
    related: list[KnowledgeNodeOut]
    edges: list[KnowledgeEdgeOut]
