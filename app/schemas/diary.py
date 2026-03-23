# 담당 : A팀원 유가영
from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
import uuid


# ── 일기 생성할 때 받는 데이터 ──────────────────
class DiaryCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    emotion: Optional[str] = Field(None, max_length=100)
    weather: Optional[str] = Field(None, max_length=100)
    content: str
    diary_date: date
    input_type: str = "text"          # "text" | "voice" | "mixed"
    hashtags: list[str] = []          # 예: ["여행", "행복"]
    persona_id: Optional[uuid.UUID] = None


# ── 일기 수정할 때 받는 데이터 ──────────────────
class DiaryUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    emotion: Optional[str] = Field(None, max_length=100)
    weather: Optional[str] = Field(None, max_length=100)
    content: Optional[str] = None
    diary_date: Optional[date] = None


# ── API가 응답할 때 보내는 데이터 ────────────────
class DiaryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    persona_id: Optional[uuid.UUID]
    title: Optional[str]
    emotion: Optional[str]
    weather: Optional[str]
    content: str
    input_type: str
    diary_date: date
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
