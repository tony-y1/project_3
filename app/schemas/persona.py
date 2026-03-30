# 담당 : A팀원 유가영
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
import uuid

# 페르소나 생성
class PersonaCreate(BaseModel):
    name: str = Field(..., max_length=50, description="페르소나 이름 (예: 다정이)")
    preset_type: Optional[str] = Field(
        None,
        description="empathy(공감형) | advice(조언형) | info(정보제공형) | custom(직접입력)"
    )
    custom_description: Optional[str] = Field(
        None,
        description="preset_type=custom일 때 직접 입력하는 말투/성격 설명"
    )

# 페르소나 수정
class PersonaUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    preset_type: Optional[str] = None
    custom_description: Optional[str] = None
    is_active: Optional[bool] = None

# 온보딩 Q&A 요청
class PersonaOnboardingRequest(BaseModel):
    name: str = Field(..., max_length=50, description="말벗 이름")
    nickname: str = Field(..., description="사용자 호칭")
    pace: str = Field(..., description="하루 페이스")
    reason: str = Field(..., description="일기 쓰는 이유")
    style: str = Field(..., description="원하는 말벗 스타일")
    memory: Optional[str] = Field(None, description="기억해줬으면 하는 것 (선택)")
    voice: Optional[str] = Field(None, description="TTS 목소리 (alloy | nova | echo | fable | onyx | shimmer)")
    image_url: Optional[str] = Field(None, description="아바타 이미지 경로")

# 페르소나 응답
class PersonaResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    preset_type: Optional[str]
    custom_description: Optional[str]
    image_url: Optional[str]
    voice: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True