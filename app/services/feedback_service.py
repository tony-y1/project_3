# 담당 : A팀원 유가영
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.models.ai_feedback import AiFeedback
from app.services.gpt_service import GPTService


class FeedbackService:

    def __init__(self):
        self.gpt = GPTService()

    # ── GPT 피드백 생성 & DB 저장 ─────────────────
    async def create_feedback(
        self,
        db: AsyncSession,
        diary_id: uuid.UUID,
        diary_content: str,
        diary_date: str,
        persona_name: str,
        system_prompt: str,
    ) -> AiFeedback:

        # 이미 피드백이 있으면 기존 것 반환
        existing = await self.get_feedback(db, diary_id)
        if existing:
            return existing

        # GPT 호출
        feedback_text = await self.gpt.generate_feedback(
            diary_content=diary_content,
            diary_date=diary_date,
            persona_name=persona_name,
            system_prompt=system_prompt,
        )

        # DB 저장
        feedback = AiFeedback(diary_id=diary_id, content=feedback_text)
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        return feedback

    # ── 저장된 피드백 조회 ───────────────────────
    async def get_feedback(
        self,
        db: AsyncSession,
        diary_id: uuid.UUID,
    ) -> AiFeedback | None:
        stmt = select(AiFeedback).where(AiFeedback.diary_id == diary_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()