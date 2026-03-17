# 담당: 나솔림 (STT/TTS/GPT 스트리밍 파이프라인)
# (O): POST /stt         - 음성 파일 → 텍스트 
# (O): POST /tts         - 텍스트 → 음성 파일 (OpenAI TTS)  
# (O): POST /tts/stream  - GPT 응답 스트리밍 → TTS 파이프라인

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from app.services.stt_service import stt_service
from app.services.tts_service import tts_service
from app.services.gpt_service import gpt_service

router = APIRouter()

# ── 요청/응답 스키마 ──────────────────────────────────────
class TTSRequest(BaseModel):
    text: str


class STTResponse(BaseModel):
    transcript: str

# default값으로 공감 많은 반응을 지정
class StreamFeedbackRequest(BaseModel):
    diary_content: str
    persona_prompt: str = "당신은 따뜻하고 공감을 잘하는 말벗이에요. 일기를 읽고 2~3문장으로 공감해주세요."


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

# ── TTS Stream: GPT 스트리밍 → TTS 파이프라인 ────────────
@router.post("/tts/stream")
async def stream_feedback_tts(request: StreamFeedbackRequest):
    if not request.diary_content.strip():
        raise HTTPException(status_code=400, detail="일기 내용이 비어있어요")

    async def generate():
        async for sentence in gpt_service.stream_feedback(
            diary_content=request.diary_content,
            persona_prompt=request.persona_prompt,
        ):
            # 문장 → TTS 변환 → 오디오 청크 전송
            audio_bytes = await tts_service.synthesize(text=sentence)
            yield audio_bytes

    return StreamingResponse(
        generate(),
        media_type="audio/mpeg",
        headers={"X-Content-Type-Options": "nosniff"},
    )