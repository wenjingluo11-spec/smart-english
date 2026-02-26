import datetime
import re
import bcrypt
import jwt
from app.config import settings


def validate_password(password: str) -> str | None:
    """校验密码强度，返回错误信息或 None。"""
    if len(password) < 6:
        return "密码长度至少 6 位"
    if len(password) > 128:
        return "密码长度不能超过 128 位"
    return None


def validate_phone(phone: str) -> str | None:
    """校验手机号格式。"""
    if not re.match(r"^1[3-9]\d{9}$", phone):
        return "手机号格式不正确"
    return None


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.datetime.now(datetime.UTC)
        + datetime.timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> int | None:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
