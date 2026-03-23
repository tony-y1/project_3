# 담당 : A팀원 유가영
# 교수님 피드백 반영: 공감형/조언형/정보제공형/커스텀 페르소나 타입 명확화
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.persona import Persona
from app.schemas.persona import PersonaCreate, PersonaUpdate, PersonaResponse

router = APIRouter()

VALID_PRESET_TYPES = {"empathy", "advice", "info", "custom"}


# ── GET /personas ─ 내 페르소나 목록
@router.get("/", response_model=list[PersonaResponse])
async def list_personas(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Persona).where(Persona.user_id == current_user.id)
    result = await db.execute(stmt)
    return result.scalars().all()


# ── POST /personas ─ 페르소나 생성
@router.post("/", response_model=PersonaResponse, status_code=201)
async def create_persona(
    body: PersonaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # preset_type 유효성 검사
    if body.preset_type and body.preset_type not in VALID_PRESET_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"preset_type은 {VALID_PRESET_TYPES} 중 하나여야 합니다."
        )
    # custom 타입인데 설명이 없으면 에러
    if body.preset_type == "custom" and not body.custom_description:
        raise HTTPException(
            status_code=400,
            detail="custom 타입은 custom_description이 필요합니다."
        )

    persona = Persona(
        user_id=current_user.id,
        name=body.name,
        preset_type=body.preset_type,
        custom_description=body.custom_description,
    )
    db.add(persona)
    await db.commit()
    await db.refresh(persona)
    return persona


# ── PATCH /personas/{persona_id} ─ 페르소나 수정
@router.patch("/{persona_id}", response_model=PersonaResponse)
async def update_persona(
    persona_id: uuid.UUID,
    body: PersonaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Persona).where(
        Persona.id == persona_id,
        Persona.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    persona = result.scalar_one_or_none()
    if not persona:
        raise HTTPException(status_code=404, detail="페르소나를 찾을 수 없습니다.")

    if body.name is not None:
        persona.name = body.name
    if body.preset_type is not None:
        if body.preset_type not in VALID_PRESET_TYPES:
            raise HTTPException(status_code=400, detail=f"preset_type은 {VALID_PRESET_TYPES} 중 하나여야 합니다.")
        persona.preset_type = body.preset_type
    if body.custom_description is not None:
        persona.custom_description = body.custom_description
    if body.is_active is not None:
        persona.is_active = body.is_active

    await db.commit()
    await db.refresh(persona)
    return persona


# ── DELETE /personas/{persona_id} ─ 페르소나 삭제
@router.delete("/{persona_id}", status_code=204)
async def delete_persona(
    persona_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Persona).where(
        Persona.id == persona_id,
        Persona.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    persona = result.scalar_one_or_none()
    if not persona:
        raise HTTPException(status_code=404, detail="페르소나를 찾을 수 없습니다.")

    await db.delete(persona)
    await db.commit()