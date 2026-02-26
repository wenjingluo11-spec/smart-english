from pydantic import BaseModel


class StoryTemplateOut(BaseModel):
    id: int
    title: str
    genre: str
    cefr_min: str
    cefr_max: str
    synopsis: str
    cover_emoji: str


class StorySessionOut(BaseModel):
    id: int
    template_id: int
    template_title: str = ""
    current_chapter: int
    total_chapters: int
    status: str
    started_at: str


class StoryChapterOut(BaseModel):
    id: int
    chapter_number: int
    narrative_text: str
    choices: list[dict] | None = None
    challenge: dict | None = None
    chosen_option: str | None = None
    learning_points: list[dict] | None = None


class StoryStartRequest(BaseModel):
    template_id: int


class StoryChoiceRequest(BaseModel):
    session_id: int
    choice: str  # A/B/C


class StoryChallengeSubmit(BaseModel):
    session_id: int
    chapter_id: int
    answer: str


class StoryChallengeResult(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: str
    xp: dict | None = None
