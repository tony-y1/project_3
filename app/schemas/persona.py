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

# 페르소나 응답
class PersonaResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    preset_type: Optional[str]
    custom_description: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True