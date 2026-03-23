from pydantic import BaseModel, Field
from datetime import datetime
import uuid


# ── 회원가입 요청 데이터 ──────────────────────────
class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)
    nickname: str = Field(min_length=1, max_length=50)


# ── 로그인 요청 데이터 ───────────────────────────
class UserLogin(BaseModel):
    username: str
    password: str


# ── 유저 응답 데이터 (비밀번호 제외) ──────────────
class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    nickname: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── 토큰 응답 데이터 ─────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
