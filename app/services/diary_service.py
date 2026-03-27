# 담당 : A팀원 유가영
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import uuid

from app.models.diary import Diary
from app.models.hashtag import Hashtag, DiaryHashtag
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
            emotion=data.emotion,
            weather=data.weather,
            content=data.content,
            input_type=data.input_type,
            diary_date=data.diary_date,
        )
        db.add(diary)
        await db.flush()  # id 먼저 확보

        # 해시태그 저장 (Hashtag 생성 → DiaryHashtag 연결)
        for tag in data.hashtags:
            tag_name = tag.strip()
            # 기존 태그 조회
            existing = await db.execute(
                select(Hashtag).where(
                    Hashtag.user_id == user_id,
                    Hashtag.name == tag_name,
                )
            )
            hashtag = existing.scalar_one_or_none()
            # 없으면 새로 생성
            if not hashtag:
                hashtag = Hashtag(user_id=user_id, name=tag_name)
                db.add(hashtag)
                await db.flush()
            # 일기-태그 연결
            db.add(DiaryHashtag(diary_id=diary.id, hashtag_id=hashtag.id))

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
            stmt = (
                stmt
                .join(DiaryHashtag, Diary.id == DiaryHashtag.diary_id)
                .join(Hashtag, DiaryHashtag.hashtag_id == Hashtag.id)
                .where(Hashtag.name == tag)
            )

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
        if data.emotion is not None:
            diary.emotion = data.emotion
        if data.weather is not None:
            diary.weather = data.weather
        if data.content is not None:
            diary.content = data.content
        if data.diary_date is not None:
            diary.diary_date = data.diary_date
        if data.persona_id is not None:
            diary.persona_id = data.persona_id

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


    # ── 해시태그 추가 ─────────────────────────────
    async def add_hashtags(
        self,
        db: AsyncSession,
        diary_id: uuid.UUID,
        user_id: uuid.UUID,
        hashtags: list[str],
    ) -> None:
        for tag in hashtags:
            tag_name = tag.strip()
            if not tag_name:
                continue
            # 기존 태그 조회
            existing = await db.execute(
                select(Hashtag).where(
                    Hashtag.user_id == user_id,
                    Hashtag.name == tag_name,
                )
            )
            hashtag = existing.scalar_one_or_none()
            # 없으면 새로 생성
            if not hashtag:
                hashtag = Hashtag(user_id=user_id, name=tag_name)
                db.add(hashtag)
                await db.flush()
            # 중복 연결 확인
            existing_link = await db.execute(
                select(DiaryHashtag).where(
                    DiaryHashtag.diary_id == diary_id,
                    DiaryHashtag.hashtag_id == hashtag.id,
                )
            )
            if not existing_link.scalar_one_or_none():
                db.add(DiaryHashtag(diary_id=diary_id, hashtag_id=hashtag.id))
        await db.commit()