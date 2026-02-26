from pydantic import BaseModel


class BattleRoundOut(BaseModel):
    round: int
    p1_input: str = ""
    p2_input: str = ""
    p1_score: int = 0
    p2_score: int = 0


class BattleResultOut(BaseModel):
    id: int
    mode: str
    player1_id: int
    player2_id: int | None = None
    status: str
    rounds: list[BattleRoundOut] | None = None
    winner_id: int | None = None


class RatingOut(BaseModel):
    rating: int
    tier: str
    wins: int
    losses: int
    season: int


class LeaderboardEntry(BaseModel):
    user_id: int
    phone: str = ""
    rating: int
    tier: str
    wins: int


class BattleRequest(BaseModel):
    mode: str
