# 담당: 나솔림
# Text-to-Speech

import io
import time
import logging
from openai import AsyncOpenAI, OpenAIError
from fastapi import HTTPException
from app.config import get_settings
from app.services.redis_service import get_tts_cache, set_tts_cache

settings = get_settings()
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
logger = logging.getLogger(__name__)

class TTSService:
    async def synthesize(
        self,
        text: str,
    ) -> bytes:
        if settings.USE_REDIS:
            cached = await get_tts_cache(text)
            if cached:
                logger.info("TTS 캐시 hit: %.0f자", len(text))
                return cached

        start = time.time()
        try:
            response = await client.audio.speech.create(
                model="tts-1",
                voice="nova",
                input=text,
                response_format="mp3",#wav
            )
        except OpenAIError as e:
            logger.error(f"TTS 오류: {e}")
            raise HTTPException(status_code=503, detail="음성 합성 서비스에 문제가 발생했어요.")
        # voice
        # │ alloy   │ 중성적, 차분                  
        # │ nova    │ 여성적, 따뜻함 
        # │ echo    │ 남성적, 묵직함                
        # │ fable   │ 부드럽고 표현력 있음          
        # │ onyx    │ 깊고 안정적인 남성            
        # │ shimmer │ 밝고 명랑한 여성 

        audio_bytes = response.content
        elapsed = time.time() - start
        logger.info("TTS 생성 완료: %.2fs | %.0f자 | %.1fKB", elapsed, len(text), len(audio_bytes) / 1024)

        if settings.USE_REDIS:
            await set_tts_cache(text, audio_bytes)

        return audio_bytes

tts_service = TTSService()