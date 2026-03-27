# 담당 : A팀원 유가영
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.database import get_db
from app.schemas.diary import DiaryCreate, DiaryUpdate, DiaryResponse
from app.services.diary_service import DiaryService
from app.services.feedback_service import FeedbackService
from app.core.security import get_current_user
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
diary_svc = DiaryService()
feedback_svc = FeedbackService()


# ── GET /diaries ─ 목록 조회 ────────────────────
@router.get("/", response_model=list[DiaryResponse])
async def list_diaries(
    tag: str | None = Query(None, description="해시태그 필터"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await diary_svc.get_diaries(db, current_user.id, tag)


# ── POST /diaries ─ 일기 생성 ───────────────────
@router.post("/", response_model=DiaryResponse, status_code=201)
async def create_diary(
    body: DiaryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    diary = await diary_svc.create_diary(db, current_user.id, body)

    # 일기 생성 후 AI 피드백 자동 생성 (백그라운드)
    try:
        from app.models.persona import Persona
        from sqlalchemy import select as sa_select
        persona = None
        if diary.persona_id:
            result = await db.execute(sa_select(Persona).where(Persona.id == diary.persona_id))
            persona = result.scalar_one_or_none()

        await feedback_svc.create_feedback(
            db=db,
            diary_id=diary.id,
            user_id=current_user.id,
            persona_id=diary.persona_id,
            diary_content=diary.content,
            persona_name=persona.name if persona else "말벗",
            preset_type=persona.preset_type if persona else "empathy",
            custom_description=persona.custom_description if persona else None,
        )
    
    except Exception:
        pass  # 피드백 실패해도 일기 생성은 성공으로 처리
    
    # 해시태그 자동 생성
    try:
        from app.services.gpt_service import gpt_service
        hashtags = await gpt_service.generate_hashtags(diary.content)
        if hashtags:
            await diary_svc.add_hashtags(db, diary.id, current_user.id, hashtags)
    except Exception:
        pass  # 해시태그 생성 실패해도 일기 생성은 성공으로 처리
    
    return diary

    # 해시태그 자동 생성
    try:
        from app.services.gpt_service import gpt_service
        from app.services.diary_service import DiaryService
        hashtags = await gpt_service.generate_hashtags(diary.content)
        if hashtags:
            await diary_svc.add_hashtags(db, diary.id, current_user.id, hashtags)
    
    except Exception:
        pass  # 해시태그 생성 실패해도 일기 생성은 성공으로 처리

# ── GET /diaries/{diary_id} ─ 단건 조회 ─────────
@router.get("/{diary_id}", response_model=DiaryResponse)
async def get_diary(
    diary_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    diary = await diary_svc.get_diary(db, diary_id, current_user.id)
    if not diary:
        raise HTTPException(status_code=404, detail="일기를 찾을 수 없습니다.")
    return diary

# ── GET /diaries/{diary_id}/hashtags ─ 해시태그 조회
@router.get("/{diary_id}/hashtags")
async def get_diary_hashtags(
    diary_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    diary = await diary_svc.get_diary(db, diary_id, current_user.id)
    if not diary:
        raise HTTPException(status_code=404, detail="일기를 찾을 수 없습니다.")

    from app.models.hashtag import Hashtag, DiaryHashtag
    from sqlalchemy import select as sa_select
    stmt = (
        sa_select(Hashtag)
        .join(DiaryHashtag, Hashtag.id == DiaryHashtag.hashtag_id)
        .where(DiaryHashtag.diary_id == diary_id)
    )
    result = await db.execute(stmt)
    hashtags = result.scalars().all()
    return {"hashtags": [tag.name for tag in hashtags]}

# ── DELETE /diaries/{diary_id}/hashtags/{tag_name} ─ 해시태그 삭제
@router.delete("/{diary_id}/hashtags/{tag_name}", status_code=204)
async def delete_diary_hashtag(
    diary_id: uuid.UUID,
    tag_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    diary = await diary_svc.get_diary(db, diary_id, current_user.id)
    if not diary:
        raise HTTPException(status_code=404, detail="일기를 찾을 수 없습니다.")

    from app.models.hashtag import Hashtag, DiaryHashtag
    from sqlalchemy import select as sa_select

    # 해시태그 조회
    stmt = (
        sa_select(Hashtag)
        .where(Hashtag.user_id == current_user.id, Hashtag.name == tag_name)
    )
    result = await db.execute(stmt)
    hashtag = result.scalar_one_or_none()
    if not hashtag:
        raise HTTPException(status_code=404, detail="해시태그를 찾을 수 없습니다.")

    # 일기-태그 연결 삭제
    stmt_link = sa_select(DiaryHashtag).where(
        DiaryHashtag.diary_id == diary_id,
        DiaryHashtag.hashtag_id == hashtag.id,
    )
    result_link = await db.execute(stmt_link)
    link = result_link.scalar_one_or_none()
    if link:
        await db.delete(link)
        await db.commit()

# ── PATCH /diaries/{diary_id} ─ 수정 ────────────
@router.patch("/{diary_id}", response_model=DiaryResponse)
async def update_diary(
    diary_id: uuid.UUID,
    body: DiaryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    diary = await diary_svc.get_diary(db, diary_id, current_user.id)
    if not diary:
        raise HTTPException(status_code=404, detail="일기를 찾을 수 없습니다.")
    original_content = diary.content
    original_persona_id = diary.persona_id
    updated_diary = await diary_svc.update_diary(db, diary, body)

    # 일기 수정 후 AI 피드백 자동 갱신
    try:
        from app.models.persona import Persona
        from sqlalchemy import select as sa_select
        persona = None
        if updated_diary.persona_id:
            result = await db.execute(sa_select(Persona).where(Persona.id == updated_diary.persona_id))
            persona = result.scalar_one_or_none()

#        logger.info(f"수정 전 : {original_persona_id}")
#        logger.info(f"수정 후 : {updated_diary.persona_id}")
        
        # 일기 내용 또는 페르소나가 변경된 경우에만 피드백 재생성
        content_changed = body.content is not None and body.content != original_content
        persona_changed = updated_diary.persona_id is not None and updated_diary.persona_id != original_persona_id
        if content_changed or persona_changed:
 #           logger.info(f"달라진거 피드백 재생성 시도")
            existing = await feedback_svc.get_feedback(db, diary_id)
            if existing:
                await db.delete(existing)
                await db.commit()
        else:

#            logger.info(f"피드백 재생성 시도안함")
            return updated_diary  # 변경 없으면 피드백 재생성 안 함

        # 새 피드백 생성
        await feedback_svc.create_feedback(
            db=db,
            diary_id=updated_diary.id,
            user_id=current_user.id,
            persona_id=updated_diary.persona_id,
            diary_content=updated_diary.content,
            persona_name=persona.name if persona else "말벗",
            preset_type=persona.preset_type if persona else "empathy",
            custom_description=persona.custom_description if persona else None,
        )
    except Exception:
        pass  # 피드백 갱신 실패해도 일기 수정은 성공으로 처리

      # 내용 변경 시 해시태그 재생성
    try:
        if body.content is not None and body.content != original_content:
            from app.services.gpt_service import gpt_service
            from app.models.hashtag import DiaryHashtag
            from sqlalchemy import select as sa_select2

            # 기존 해시태그 연결 삭제
            stmt_del = sa_select2(DiaryHashtag).where(DiaryHashtag.diary_id == diary_id)
            result_del = await db.execute(stmt_del)
            for dh in result_del.scalars().all():
                await db.delete(dh)
            await db.commit()

            # 새 해시태그 생성
            hashtags = await gpt_service.generate_hashtags(updated_diary.content)
            if hashtags:
                await diary_svc.add_hashtags(db, diary_id, current_user.id, hashtags)
    except Exception:
        pass  # 해시태그 재생성 실패해도 수정은 성공으로 처리

    return updated_diary


# ── DELETE /diaries/{diary_id} ─ 삭제 ───────────
@router.delete("/{diary_id}", status_code=204)
async def delete_diary(
    diary_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    diary = await diary_svc.get_diary(db, diary_id, current_user.id)
    if not diary:
        raise HTTPException(status_code=404, detail="일기를 찾을 수 없습니다.")
    await diary_svc.delete_diary(db, diary)
