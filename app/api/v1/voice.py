# 담당: 나솔림 (STT/TTS/GPT 스트리밍 파이프라인)
# (O): POST /stt         - 음성 파일 → 텍스트 
# (O): POST /tts         - 텍스트 → 음성 파일 (OpenAI TTS)  
# TODO: POST /tts/stream  - GPT 응답 스트리밍 → TTS 파이프라인

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from app.services.stt_service import stt_service
from app.services.tts_service import tts_service

router = APIRouter()

# ── 요청/응답 스키마 ──────────────────────────────────────
class TTSRequest(BaseModel):
    text: str


class STTResponse(BaseModel):
    transcript: str


# ── STT: 음성 → 텍스트 ───────────────────────────────────
@router.post("/stt", response_model=STTResponse)
async def speech_to_text(file: UploadFile = File(...)):
    # 지원 포맷 확인
    allowed = {"audio/webm", "audio/wav", "audio/mp4", "audio/mpeg"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 포맷: {file.content_type}")

    audio_bytes = await file.read()
    transcript = await stt_service.transcribe(
        audio_bytes=audio_bytes,
        filename=file.filename or "audio.webm",
    )
    return STTResponse(transcript=transcript)

# ── TTS: 텍스트 → 음성 ───────────────────────────────────
@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="텍스트가 비어있어요")

    audio_bytes = await tts_service.synthesize(text=request.text)

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=speech.mp3"},
    )