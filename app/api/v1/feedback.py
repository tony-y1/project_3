# 담당 : A팀원 유가영
# 교수님 피드백 반영: 스트리밍 응답으로 반응 속도 최적화
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.diary import Diary
from app.models.persona import Persona
from app.services.feedback_service import FeedbackService

router = APIRouter()
feedback_svc = FeedbackService()


async def _get_diary_or_404(diary_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Diary:
    stmt = select(Diary).where(Diary.id == diary_id, Diary.user_id == user_id)
    result = await db.execute(stmt)
    diary = result.scalar_one_or_none()
    if not diary:
        raise HTTPException(status_code=404, detail="일기를 찾을 수 없습니다.")
    return diary


async def _get_persona(persona_id: uuid.UUID | None, db: AsyncSession):
    """페르소나 조회 (없으면 기본값 반환)"""
    if not persona_id:
        return None
    stmt = select(Persona).where(Persona.id == persona_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# ── POST /feedback/{diary_id}/stream ─ 스트리밍 피드백 (교수님 피드백 반영)
@router.post("/{diary_id}/stream")
async def stream_feedback(
    diary_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI 피드백을 스트리밍으로 반환합니다.
    문장이 생성될 때마다 즉시 클라이언트로 전송됩니다.
    """
    diary = await _get_diary_or_404(diary_id, current_user.id, db)
    persona = await _get_persona(diary.persona_id, db)

    persona_name = persona.name if persona else "말벗"
    preset_type = persona.preset_type if persona else "empathy"
    custom_description = persona.custom_description if persona else None

    async def generate():
        async for sentence in feedback_svc.stream_feedback(
            diary_content=diary.content,
            persona_name=persona_name,
            preset_type=preset_type,
            custom_description=custom_description,
        ):
            yield sentence + "\n"

    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")


# ── POST /feedback/{diary_id} ─ 피드백 생성 & DB 저장
@router.post("/{diary_id}", status_code=201)
async def create_feedback(
    diary_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    diary = await _get_diary_or_404(diary_id, current_user.id, db)
    persona = await _get_persona(diary.persona_id, db)

    persona_name = persona.name if persona else "말벗"
    preset_type = persona.preset_type if persona else "empathy"
    custom_description = persona.custom_description if persona else None

    feedback = await feedback_svc.create_feedback(
        db=db,
        diary_id=diary_id,
        persona_id=diary.persona_id,
        diary_content=diary.content,
        persona_name=persona_name,
        preset_type=preset_type,
        custom_description=custom_description,
    )
    return {"diary_id": str(diary_id), "feedback_text": feedback.feedback_text}

# ── GET /feedback/{diary_id} ─ 저장된 피드백 조회
@router.get("/{diary_id}")
async def get_feedback(
    diary_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_diary_or_404(diary_id, current_user.id, db)
    feedback = await feedback_svc.get_feedback(db, diary_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="피드백이 없습니다. 먼저 생성해주세요.")
    return {"diary_id": str(diary_id), "feedback_text": feedback.feedback_text}