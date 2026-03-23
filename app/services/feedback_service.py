# 담당 : A팀원 유가영
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from app.models.ai_feedback import AiFeedback
from app.services.gpt_service import GPTService
from typing import AsyncGenerator

# 교수님 피드백 반영: 페르소나별 말투 가이드라인
PERSONA_PROMPTS = {
    "empathy": (
        "당신은 따뜻하고 공감 능력이 뛰어난 말벗입니다. "
        "사용자의 감정을 먼저 읽고, '그랬구나', '많이 힘들었겠다' 같은 공감 표현을 자주 사용하세요. "
        "조언보다는 감정을 받아주는 데 집중하세요. 2~3문장으로 짧게 답하세요."
    ),
    "advice": (
        "당신은 현실적이고 솔직한 조언을 해주는 말벗입니다. "
        "사용자의 상황을 파악하고 구체적인 행동 방안을 제안하세요. "
        "부드럽지만 직접적으로 이야기하세요. 2~3문장으로 짧게 답하세요."
    ),
    "info": (
        "당신은 지식이 풍부하고 차분한 정보 제공형 말벗입니다. "
        "사용자의 일기에서 관련된 유용한 정보나 관점을 제공하세요. "
        "객관적이고 명확하게 이야기하세요. 2~3문장으로 짧게 답하세요."
    ),
    "custom": (
        "당신은 사용자가 설정한 말벗입니다. "
        "사용자의 일기에 진심 어린 반응을 해주세요. 2~3문장으로 짧게 답하세요."
    ),
}

DEFAULT_PROMPT = PERSONA_PROMPTS["empathy"]


def build_system_prompt(persona_name: str, preset_type: str | None, custom_description: str | None) -> str:
    if preset_type and preset_type in PERSONA_PROMPTS:
        base = PERSONA_PROMPTS[preset_type]
    elif custom_description:
        base = f"당신은 {custom_description} 성격의 말벗입니다. 2~3문장으로 짧게 답하세요."
    else:
        base = DEFAULT_PROMPT
    return f"당신의 이름은 '{persona_name}'입니다. " + base


class FeedbackService:
    def __init__(self):
        self.gpt = GPTService()

    # ── 스트리밍 피드백 생성
    async def stream_feedback(
        self,
        diary_content: str,
        persona_name: str,
        preset_type: str | None,
        custom_description: str | None,
    ) -> AsyncGenerator[str, None]:
        system_prompt = build_system_prompt(persona_name, preset_type, custom_description)
        async for sentence in self.gpt.stream_feedback(
            diary_content=diary_content,
            persona_prompt=system_prompt,
        ):
            yield sentence

    # ── 피드백 생성 & DB 저장
    async def create_feedback(
        self,
        db: AsyncSession,
        diary_id: uuid.UUID,
        persona_id: uuid.UUID | None,
        diary_content: str,
        persona_name: str,
        preset_type: str | None,
        custom_description: str | None,
    ) -> AiFeedback:
        existing = await self.get_feedback(db, diary_id)
        if existing:
            return existing

        system_prompt = build_system_prompt(persona_name, preset_type, custom_description)

        # GPT 스트리밍 결과 모아서 저장
        full_text = ""
        async for sentence in self.gpt.stream_feedback(
            diary_content=diary_content,
            persona_prompt=system_prompt,
        ):
            full_text += sentence + " "

        # 페르소나 없으면 임시 UUID 사용
        dummy_persona_id = persona_id or uuid.UUID("00000000-0000-0000-0000-000000000000")

        feedback = AiFeedback(
            diary_id=diary_id,
            persona_id=dummy_persona_id,
            feedback_text=full_text.strip(),
            feedback_type=preset_type or "empathy",
        )
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        return feedback

    # ── 저장된 피드백 조회
    async def get_feedback(
        self,
        db: AsyncSession,
        diary_id: uuid.UUID,
    ) -> AiFeedback | None:
        stmt = select(AiFeedback).where(AiFeedback.diary_id == diary_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()