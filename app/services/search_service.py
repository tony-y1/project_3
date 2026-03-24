# 담당 : A팀원 유가영
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from openai import AsyncOpenAI
from app.config import get_settings
from app.models.diary import Diary

settings = get_settings()
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


class SearchService:

    # ── 일기 목록 가져와서 GPT로 검색
    async def search_diaries(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        query: str,
    ) -> list[dict]:
        # 사용자의 모든 일기 조회
        stmt = select(Diary).where(Diary.user_id == user_id)
        result = await db.execute(stmt)
        diaries = result.scalars().all()

        if not diaries:
            return []

        # 일기 목록을 텍스트로 변환
        diary_texts = "\n".join([
            f"[일기 ID: {diary.id}] [{diary.diary_date}] {diary.content}"
            for diary in diaries
        ])

        # GPT에게 검색 요청
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "당신은 사용자의 일기를 검색해주는 도우미입니다. "
                        "사용자가 찾고 싶은 기억을 입력하면, "
                        "아래 일기 목록에서 가장 관련 있는 일기의 ID를 찾아주세요. "
                        "관련 있는 일기 ID만 쉼표로 구분해서 반환하세요. "
                        "없으면 '없음'이라고 답하세요.\n\n"
                        f"일기 목록:\n{diary_texts}"
                    ),
                },
                {"role": "user", "content": query},
            ],
            max_tokens=200,
        )

        gpt_answer = response.choices[0].message.content.strip()

        if gpt_answer == "없음" or not gpt_answer:
            return []

        # GPT가 반환한 ID로 일기 조회
        matched_ids = [id.strip() for id in gpt_answer.split(",")]
        matched_diaries = []
        for diary in diaries:
            if str(diary.id).replace("-", "") in matched_ids or str(diary.id) in matched_ids:
                matched_diaries.append({
                    "id": str(diary.id),
                    "diary_date": str(diary.diary_date),
                    "title": diary.title,
                    "content": diary.content,
                })

        return matched_diaries