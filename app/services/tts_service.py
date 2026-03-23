# 담당: 나솔림
# Text-to-Speech

import io
from openai import AsyncOpenAI
from app.config import get_settings
from app.services.redis_service import get_tts_cache, set_tts_cache

settings = get_settings()
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

class TTSService:
    async def synthesize(
        self,
        text: str,
    ) -> bytes:
        if settings.USE_REDIS:
            cached = await get_tts_cache(text)
            if cached:
                return cached

        response = await client.audio.speech.create(
            model="tts-1",
            voice="alloy", #nova
            input=text,
            response_format="mp3",#wav
        )
        audio_bytes = response.content

        if settings.USE_REDIS:
            await set_tts_cache(text, audio_bytes)

        return audio_bytes

tts_service = TTSService()