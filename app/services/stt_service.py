# 담당: 나솔림
# Speech-to-Text
# 1: OpenAI Whisper (배치 방식) : 브라우저 녹음 완료 > 파일 전송 > /stt > 텍스트 반환
# 2: Azure SDK 실시간 스트리밍 (WebSocket) : 브라우저 마이크 > WebSocket 연결 > /ws/stt > 실시간 텍스트 반환

import io
import logging
import azure.cognitiveservices.speech as speechsdk
from openai import AsyncOpenAI, OpenAIError
from fastapi import HTTPException
from app.config import get_settings

settings = get_settings()
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
logger = logging.getLogger(__name__)

class STTService:
    # 1
    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "audio.webm",
        language: str = "ko",
    ) -> str:
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename

        try:
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language,
            )
        except OpenAIError as e:
            logger.error(f"STT 오류: {e}")
            raise HTTPException(status_code=503, detail="음성 인식 서비스에 문제가 발생했어요.")
        return response.text
    # 2
    def create_azure_recognizer(self) -> speechsdk.SpeechRecognizer:
        """Azure Speech 인식기 생성"""
        speech_config = speechsdk.SpeechConfig(
            subscription=settings.AZURE_SPEECH_KEY,
            region=settings.AZURE_SPEECH_REGION,
        )
        speech_config.speech_recognition_language = "ko-KR"

        stream_format = speechsdk.audio.AudioStreamFormat(
                samples_per_second=16000,
                bits_per_sample=16,
                channels=1,
            )

        # 마이크 대신 스트림에서 입력받는 설정
        stream = speechsdk.audio.PushAudioInputStream(stream_format)
        audio_config = speechsdk.audio.AudioConfig(stream=stream)

        recognizer = speechsdk.SpeechRecognizer(
            speech_config=speech_config,
            audio_config=audio_config,
        )
        return recognizer, stream

stt_service = STTService()