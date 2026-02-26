from pydantic import BaseModel


class TextbookOut(BaseModel):
    id: int
    name: str
    publisher: str
    grade: str
    semester: str
    cover_url: str

    class Config:
        from_attributes = True


class UnitOut(BaseModel):
    id: int
    unit_number: int
    title: str
    topic: str
    vocabulary_json: list | None = None
    grammar_points_json: list | None = None
    key_sentences_json: list | None = None

    class Config:
        from_attributes = True


class SetTextbookRequest(BaseModel):
    textbook_id: int
    current_unit_id: int | None = None
