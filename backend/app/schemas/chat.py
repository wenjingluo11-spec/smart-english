from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # user / assistant
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    mode: str = "free"  # free / grammar / speaking / explain
    session_id: int | None = None
    reflection_text: str = ""
    guidance_level: str = "socratic"  # socratic / mirror / hybrid
    hint_budget: int = 2
    allow_direct_answer: bool = False


class CognitiveDemoRequest(BaseModel):
    """认知增强 demo 的请求体。"""

    prompt: str
    reflection_text: str = ""
    guidance_level: str = "mirror"  # socratic / mirror / hybrid
    hint_budget: int = 2
    mode: str = "explain"
