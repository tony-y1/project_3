# 담당 : A팀원 유가영
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
import uuid

from app.models.diary import Diary
from app.models.hashtag import Hashtag
from app.schemas.diary import DiaryCreate, DiaryUpdate


class DiaryService:

    # ── 일기 생성 ───────────────────────────────
    async def create_diary(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        data: DiaryCreate,
    ) -> Diary:
        diary = Diary(
            user_id=user_id,
            persona_id=data.persona_id,
            title=data.title,
            content=data.content,
            input_type=data.input_type,
            diary_date=data.diary_date,
        )
        db.add(diary)
        await db.flush()          # id 먼저 확보

        # 해시태그 저장
        for tag in data.hashtags:
            db.add(Hashtag(diary_id=diary.id, tag=tag.strip()))

        await db.commit()
        await db.refresh(diary)
        return diary

    # ── 목록 조회 (날짜 최신순 + 해시태그 필터) ────
    async def get_diaries(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        tag: str | None = None,
    ) -> list[Diary]:
        stmt = (
            select(Diary)
            .where(Diary.user_id == user_id)
            .order_by(desc(Diary.diary_date))
        )
        if tag:
            stmt = stmt.join(Diary.hashtags).where(Hashtag.tag == tag)

        result = await db.execute(stmt)
        return result.scalars().all()

    # ── 단건 조회 ───────────────────────────────
    async def get_diary(
        self,
        db: AsyncSession,
        diary_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Diary | None:
        stmt = select(Diary).where(
            Diary.id == diary_id,
            Diary.user_id == user_id,
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    # ── 수정 ────────────────────────────────────
    async def update_diary(
        self,
        db: AsyncSession,
        diary: Diary,
        data: DiaryUpdate,
    ) -> Diary:
        if data.title is not None:
            diary.title = data.title
        if data.content is not None:
            diary.content = data.content
        if data.diary_date is not None:
            diary.diary_date = data.diary_date

        await db.commit()
        await db.refresh(diary)
        return diary

    # ── 삭제 ────────────────────────────────────
    async def delete_diary(
        self,
        db: AsyncSession,
        diary: Diary,
    ) -> None:
        await db.delete(diary)
        await db.commit()