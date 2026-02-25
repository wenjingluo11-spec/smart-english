from pydantic import BaseModel


class RegisterRequest(BaseModel):
    phone: str
    password: str
    grade_level: str = "初中"
    grade: str = "七年级"


class LoginRequest(BaseModel):
    phone: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    phone: str
    grade_level: str
    grade: str
    cefr_level: str
