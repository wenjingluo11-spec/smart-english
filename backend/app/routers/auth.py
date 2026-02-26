from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.schemas.user import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.services.auth import hash_password, verify_password, create_token, decode_token, validate_password, validate_phone
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id = decode_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status_code=401, detail="无效的认证令牌")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="用户不存在")
    return user


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    phone_err = validate_phone(req.phone)
    if phone_err:
        raise HTTPException(status_code=400, detail=phone_err)
    pwd_err = validate_password(req.password)
    if pwd_err:
        raise HTTPException(status_code=400, detail=pwd_err)
    existing = await db.execute(select(User).where(User.phone == req.phone))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="手机号已注册")
    user = User(
        phone=req.phone,
        hashed_password=hash_password(req.password),
        grade_level=req.grade_level,
        grade=req.grade,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenResponse(access_token=create_token(user.id))


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone == req.phone))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="手机号或密码错误")
    return TokenResponse(access_token=create_token(user.id))


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        phone=user.phone,
        grade_level=user.grade_level,
        grade=user.grade,
        cefr_level=user.cefr_level,
    )
