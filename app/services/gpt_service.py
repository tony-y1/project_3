# 담당: 나솔림 
# OpenAI GPT 스트리밍
import time
import logging
from openai import AsyncOpenAI, OpenAIError
from fastapi import HTTPException
from typing import AsyncGenerator
from app.config import get_settings

settings = get_settings()
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
logger = logging.getLogger(__name__)

class GPTService:
    async def stream_feedback(
        self,
        diary_content: str,
        persona_prompt: str,
    ) -> AsyncGenerator[str, None]:
        # 일기 > gpt한테 말벗 반응을 생성

        t_start = time.time()
        logger.info("GPT 스트리밍 시작")

        try:
            stream = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": persona_prompt},
                    {"role": "user",   "content": diary_content},
                ],
                stream=True,
                max_tokens=300,  # 2~3문장 이내 제한
            )
        except OpenAIError as e:
            logger.error(f"GPT 스트리밍 시작 오류: {e}")
            raise HTTPException(status_code=503, detail="AI 서비스에 문제가 발생했어요.")

        t_first_chunk = None
        buffer = ""
        sentence_count = 0
        try:
            async for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                # 첫 청크 도착 시간
                if delta and t_first_chunk is None:
                    t_first_chunk = time.time()
                    logger.info(f"GPT 첫 청크 도착: {t_first_chunk - t_start:.2f}s")

                buffer += delta

                # 문장 단위로 끊어서 yield
                while True:
                    candidates = []
                    for punct in (".", "!", "?", "~"):
                        idx = buffer.find(punct)
                        if idx == -1:
                            continue
                        # ~ 는 뒤에 공백이거나 버퍼 마지막일 때만 종결로 처리
                        if punct == "~" and not (idx + 1 >= len(buffer) or buffer[idx + 1] == " "):
                            continue
                        candidates.append((idx, punct))

                    if not candidates:
                        break

                    idx, punct = min(candidates, key=lambda x: x[0])
                    sentence = buffer[:idx + 1].strip()
                    buffer = buffer[idx + 1:].lstrip()

                    t_sentence = time.time()
                    sentence_count += 1
                    logger.info(f"문장 {sentence_count} 생성: {t_sentence - t_start:.2f}s | {sentence}")

                    yield sentence
        except OpenAIError as e:
            # 스트리밍 중 오류 — 헤더가 이미 전송됐으므로 로그만 남기고 중단
            logger.error(f"GPT 스트리밍 중 오류: {e}")
            return

        # 남은 텍스트 처리
        if buffer.strip():
            yield buffer.strip()

        logger.info(f"GPT 스트리밍 완료: 총 {time.time() - t_start:.2f}s")

    async def generate_persona_description(self, answers: dict) -> str:
        """온보딩 Q&A 답변으로 custom 페르소나 설명 한 문단 생성"""
        qa_text = "\n".join([
            f"- 호칭: {answers.get('nickname', '')}",
            f"- 하루 페이스: {answers.get('pace', '')}",
            f"- 일기 쓰는 이유: {answers.get('reason', '')}",
            f"- 원하는 말벗 스타일: {answers.get('style', '')}",
            f"- 기억해줬으면 하는 것: {answers.get('memory', '없음')}",
        ])
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "당신은 사용자의 일기를 들어주는 AI 말벗 캐릭터를 설계하는 전문가입니다.\n"
                            "아래 사용자의 답변을 바탕으로 말벗 캐릭터의 성격과 태도를 한 문단(3~4문장)으로 묘사해주세요.\n"
                            "반드시 한국어로 작성하고, '~해요' 체의 부드러운 존댓말로만 써주세요. 반말을 절대 섞지 마세요.\n"
                            "묘사는 반드시 '이 말벗은'으로 시작하고, 말벗이 어떤 성격과 태도로 사용자의 일기에 반응하는지 설명해주세요.\n"
                            "호칭은 말벗이 사용자를 부르는 표현입니다. 문단에서 호칭을 주어나 이름으로 쓰지 마세요. "
                            "예를 들어 호칭이 '언니'라면, '이 말벗은 언니를 따뜻하게 맞아줄 거야'처럼 목적어로만 쓰거나 아예 생략해도 됩니다.\n"
                            "마지막 문장은 반드시 말투를 명시해주세요: 친구형·공감형이면 '이 말벗은 앞으로 반말로 이야기해요.'로, "
                            "조언형·탐구형이면 '이 말벗은 앞으로 존댓말로 이야기해요.'로 끝내주세요."
                        ),
                    },
                    {"role": "user", "content": qa_text},
                ],
                max_tokens=200,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"페르소나 생성 오류: {e}")
            raise HTTPException(status_code=503, detail="AI 서비스에 문제가 발생했어요.")

    async def generate_hashtags(self, diary_content: str) -> list[str]:
        """일기 내용에서 해시태그 자동 생성"""
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "일기 내용을 읽고 아래 5가지 카테고리에서 키워드를 추출해주세요.\n"
                            "카테고리:\n"
                            "- 감정: 글쓴이가 느낀 감정 (예: 뿌듯함, 외로움, 설렘)\n"
                            "- 사건: 일어난 일이나 행동 (예: 야근, 첫출근, 이사)\n"
                            "- 장소: 언급된 장소 (예: 카페, 병원, 회사)\n"
                            "- 사람: 등장한 사람 관계 (예: 친구, 상사, 가족)\n"
                            "- 소재: 언급된 사물이나 주제 (예: 고양이, 날씨, 다이어트)\n\n"
                            "규칙:\n"
                            "1. 각 카테고리에서 1~2개, 총 5~7개 추출\n"
                            "2. 한국어 또는 영문 단어 (브랜드명·상품명 포함)\n"
                            "3. # 없이 단어만, 쉼표로 구분\n"
                            "4. 일기에 없는 내용은 만들지 말 것\n"
                            "5. 나, 저, 그, 이, 저, 우리, 그것, 이것 등 대상 지칭어는 제외할 것\n"
                            "6. 추출할 키워드가 전혀 없을 때만 '없음' 한 단어만 답할 것. 키워드가 있으면 절대 '없음'을 섞지 말 것\n"
                            "예시) 뿌듯함, 야근, 회사, 상사, 치킨, 퇴근길"
                        ),
                    },
                    {"role": "user", "content": diary_content},
                ],
                max_tokens=150,
            )
            result = response.choices[0].message.content.strip()
            if result == "없음":
                return []
            hashtags = [tag.strip() for tag in result.split(",") if tag.strip() and tag.strip() != "없음"]
            return hashtags[:7]
        except Exception as e:
            logger.error(f"해시태그 생성 오류: {e}")
            return []

    async def generate_summary(self, diary_content: str) -> str:
        """일기 내용을 1~2문장으로 요약 (메모리 컨텍스트 및 검색용)"""
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "일기 내용을 1~2문장으로 요약해주세요.\n"
                            "규칙:\n"
                            "1. 글쓴이가 한 일과 느낀 감정을 중심으로 작성\n"
                            "2. 날짜 언급 금지\n"
                            "3. '~했다', '~였다' 체의 간결한 서술형\n"
                            "4. GPT의 해석이나 평가 금지 — 일기에 있는 사실만\n"
                            "예시) 야근 후 동료와 치킨을 먹으며 스트레스를 풀었다. 오랜만에 웃은 하루였다."
                        ),
                    },
                    {"role": "user", "content": diary_content},
                ],
                max_tokens=100,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"요약 생성 오류: {e}")
            return ""

gpt_service = GPTService()
