from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter()
auth_svc = AuthService()


# ── POST /auth/register ─ 회원가입 ───────────────
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    user = await auth_svc.register(db, body)
    return user


# ── POST /auth/login ─ 로그인 (JWT 발급) ─────────
@router.post("/login", response_model=TokenResponse)
async def login(
    body: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    user, token = await auth_svc.login(db, body.username, body.password)
    return TokenResponse(access_token=token, user=user)


# ── POST /auth/logout ─ 로그아웃 ─────────────────
@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    # JWT는 stateless이므로 클라이언트에서 토큰 삭제로 처리
    return
