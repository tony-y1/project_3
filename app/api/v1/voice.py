# 담당: 나솔림 (STT/TTS/GPT 스트리밍 파이프라인)
# (O): POST /stt         - 음성 파일 → 텍스트 
# (O): POST /tts         - 텍스트 → 음성 파일 (OpenAI TTS)  
# (O): POST /tts/stream  - GPT 응답 스트리밍 → TTS 파이프라인

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, Response
from fastapi import WebSocket, WebSocketDisconnect  # azure websocket 통신을 위해 추가
import asyncio                                      # 비동기 이벤트 루프 처리를 위해 추가
from pydantic import BaseModel
from app.services.stt_service import stt_service
from app.services.tts_service import tts_service
from app.services.gpt_service import gpt_service
from app.services.redis_service import get_tts_stats
from app.config import get_settings
from app.core.security import decode_access_token, get_current_user
import logging

settings = get_settings()

logger = logging.getLogger(__name__)

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
async def speech_to_text(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    # 지원 포맷 확인
    # 브라우저는 "audio/webm;codecs=opus" 처럼 codecs 파라미터를 붙여 보내는 경우가 있어
    # 세미콜론 앞 mime type 부분만 추출해서 비교함
    allowed = {"audio/webm", "audio/wav", "audio/mp4", "audio/mpeg"}
    mime_type = (file.content_type or "").split(";")[0].strip()
    if mime_type not in allowed:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 포맷: {file.content_type}")

    # Whisper API 제한(25MB) 이전에 서버에서 먼저 차단
    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    audio_bytes = await file.read()
    if len(audio_bytes) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="파일 크기는 10MB 이하여야 해요.")

    transcript = await stt_service.transcribe(
        audio_bytes=audio_bytes,
        filename=file.filename or "audio.webm",
    )
    return STTResponse(transcript=transcript)

# ── TTS: 텍스트 → 음성 ───────────────────────────────────
@router.post("/tts")
async def text_to_speech(request: TTSRequest, current_user=Depends(get_current_user)):
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
async def stream_feedback_tts(request: StreamFeedbackRequest, current_user=Depends(get_current_user)):
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

# ── TTS 캐시 통계 ─────────────────────────────────────────
@router.get("/tts/stats")
async def tts_cache_stats(current_user=Depends(get_current_user)):
    if not settings.USE_REDIS:
        return {"message": "Redis 비활성화 상태 (USE_REDIS=False)"}
    return await get_tts_stats()


# ── WebSocket STT: 실시간 스트리밍 ───────────────────────
@router.websocket("/ws/stt")
async def websocket_stt(websocket: WebSocket):
    await websocket.accept()

    # 토큰을 URL이 아닌 첫 메시지로 수신 (URL 노출 방지)
    data = await websocket.receive_json()
    token = data.get("token")
    if not token or not decode_access_token(token):
        await websocket.close(code=4001)
        return

    logger.info("WebSocket STT 연결됨")

    recognizer, stream = stt_service.create_azure_recognizer()
    # get_event_loop()는 3.10+ deprecated — 현재 실행 중인 루프를 명시적으로 가져옴
    loop = asyncio.get_running_loop()

    async def safe_send(data: dict):
        # Azure 콜백은 별도 스레드에서 실행되므로 send_json을 직접 호출할 수 없어
        # call_soon_threadsafe + ensure_future로 이벤트 루프에 예약함.
        # 예약 후 실제 실행 시점에 WebSocket이 이미 닫혀 있을 수 있으므로
        # 예외를 여기서 잡아 조용히 무시함.
        try:
            await websocket.send_json(data)
        except Exception:
            pass

    # 중간 결과 (말하는 중)
    def on_recognizing(evt):
        logger.info(f"인식 중: {evt.result.text}")
        loop.call_soon_threadsafe(asyncio.ensure_future, safe_send({"type": "partial", "text": evt.result.text}))

    # 최종 결과 (문장 완성)
    def on_recognized(evt):
        logger.info(f"인식 완료: {evt.result.text}")
        if evt.result.text:
            loop.call_soon_threadsafe(asyncio.ensure_future, safe_send({"type": "final", "text": evt.result.text}))

    # 취소/에러
    def on_canceled(evt):
        logger.error(f"Azure STT 취소됨: {evt.result.reason}")
        logger.error(f"에러 상세: {evt.result.cancellation_details}")
        loop.call_soon_threadsafe(asyncio.ensure_future, safe_send({"type": "error", "text": "음성 인식 오류가 발생했어요."}))

    recognizer.recognizing.connect(on_recognizing)
    recognizer.recognized.connect(on_recognized)
    recognizer.canceled.connect(on_canceled)
    recognizer.start_continuous_recognition()
    logger.info("Azure STT 인식 시작됨")

    try:
        while True:
            # 브라우저에서 오디오 청크 수신
            audio_chunk = await websocket.receive_bytes()
            logger.info(f"오디오 청크 수신: {len(audio_chunk)} bytes")
            stream.write(audio_chunk)
    except WebSocketDisconnect:
        logger.info("WebSocket STT 연결 끊김")
    finally:
        recognizer.stop_continuous_recognition()
        stream.close()