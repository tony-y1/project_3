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

        # 피드백 1: 일기가 없을 경우 문구 반환
        if not diaries:
            return {"answer": "아직 작성된 일기가 없어요.", "results": []}

        # 피드백 3-1: 1차 필터링 - 키워드 포함된 일기만 추려서 GPT에 전달
        query_keywords = query.replace(" ", "")
        filtered_diaries = [
            diary for diary in diaries
            if any(kw in diary.content for kw in query.split())
        ] or diaries[:20]  # 키워드 없으면 최근 20개만

        # 일기 목록을 텍스트로 변환
        diary_texts = "\n".join([
            f"[일기 ID: {str(diary.id)}] [{diary.diary_date}] {diary.content}"
            for diary in filtered_diaries
        ])

        # 피드백 2, 3: 프롬프트 수정 - UUID 형식 명시 + 구어체 응답
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "당신은 사용자의 일기를 검색해주는 친근한 말벗입니다.\n"
                        "사용자가 찾고 싶은 기억을 입력하면, 아래 일기 목록에서 관련 내용을 찾아 구어체로 답변해주세요.\n\n"
                        "답변 형식:\n"
                        "1. 관련 일기가 있으면: 날짜와 내용을 언급하며 친근하게 답변해주세요. "
                        "예) '26년 3월 24일에 VDL V02를 구입하셨네요~'\n"
                        "2. 관련 일기가 없으면: '찾아보았지만 일기에 없는 내용이에요 :)' 라고 답변해주세요.\n\n"
                        "그리고 답변 마지막에 관련 일기 ID를 하이픈 포함 UUID 형식으로 "
                        "'[IDs: uuid1, uuid2]' 형태로 추가해주세요. 없으면 '[IDs: 없음]'으로 표시해주세요.\n\n"
                        f"일기 목록:\n{diary_texts}"
                    ),
                },
                {"role": "user", "content": query},
            ],
            max_tokens=400,
        )

        gpt_answer = response.choices[0].message.content.strip()

        # GPT 응답에서 IDs 파싱
        matched_diaries = []
        if "[IDs:" in gpt_answer:
            answer_text = gpt_answer[:gpt_answer.rfind("[IDs:")].strip()
            ids_part = gpt_answer[gpt_answer.rfind("[IDs:") + 5:].strip().rstrip("]").strip()

            if ids_part != "없음":
                matched_ids = [id.strip() for id in ids_part.split(",")]
                for diary in filtered_diaries:
                    if str(diary.id) in matched_ids:
                        matched_diaries.append({
                            "id": str(diary.id),
                            "diary_date": str(diary.diary_date),
                            "title": diary.title,
                            "content": diary.content,
                        })
        else:
            answer_text = gpt_answer

        return {"answer": answer_text, "results": matched_diaries}