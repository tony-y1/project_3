# 담당: 나솔림
# Speech-to-Text
# 구현 기간 확인 후 Azure SDK 실시간 스트리밍으로 교체 예정

import io
from openai import AsyncOpenAI
from app.config import get_settings

settings = get_settings()
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

class STTService:
    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "audio.webm",
        language: str = "ko",
    ) -> str:
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename

        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=language,
        )
        return response.text


stt_service = STTService()