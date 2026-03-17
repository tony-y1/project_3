# 담당: 나솔림 
# OpenAI GPT 스트리밍
import time
import logging
from openai import AsyncOpenAI
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

        stream = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": persona_prompt},
                {"role": "user",   "content": diary_content},
            ],
            stream=True,
            max_tokens=300,  # 2~3문장 이내 제한
        )

        t_first_chunk = None
        buffer = ""
        sentence_count = 0
        async for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            # 첫 청크 도착 시간
            if delta and t_first_chunk is None:
                t_first_chunk = time.time()
                logger.info(f"GPT 첫 청크 도착: {t_first_chunk - t_start:.2f}s")

            buffer += delta

            # 문장 단위로 끊어서 yield
            while any(p in buffer for p in (".", "!", "?", "~")):
                for punct in (".", "!", "?", "~"):
                    idx = buffer.find(punct)
                    if idx != -1:
                        sentence = buffer[:idx + 1].strip()
                        buffer = buffer[idx + 1:].lstrip()

                        t_sentence = time.time()
                        sentence_count += 1
                        logger.info(f"문장 {sentence_count} 생성: {t_sentence - t_start:.2f}s | {sentence}")

                        yield sentence
                        break

        # 남은 텍스트 처리
        if buffer.strip():
            yield buffer.strip()

        logger.info(f"GPT 스트리밍 완료: 총 {time.time() - t_start:.2f}s")


gpt_service = GPTService()
