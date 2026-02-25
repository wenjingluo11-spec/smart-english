from pydantic import BaseModel


class ReadingMaterialOut(BaseModel):
    id: int
    title: str
    cefr_level: str
    grade: str
    word_count: int


class ReadingDetailOut(ReadingMaterialOut):
    content: str
    questions_json: dict | None
