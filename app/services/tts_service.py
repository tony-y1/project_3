# 담당: 나솔림
# Text-to-Speech

import io
from openai import AsyncOpenAI
from app.config import get_settings

settings = get_settings()
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

class TTSService:
    async def synthesize(
        self,
        text: str, 
    ) -> bytes:
        
        response = await client.audio.speech.create(
            model="tts-1",
            voice="alloy", #nova
            input=text,
            response_format="mp3",#wav
        )

        return response.content
    
tts_service = TTSService()