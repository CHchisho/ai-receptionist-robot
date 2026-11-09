import base64
import logging
import time

from fastapi import APIRouter, Depends, File, UploadFile

from app.core.dependencies import get_conversation_service, get_stt_provider
from app.core.dependencies import get_tts_provider
from app.schemas.conversation import AskRequest, AskResponse, SpeakRequest, SpeakResponse, TranscribeResponse
from app.services.conversation import ConversationService
from app.services.knowledge import store
from app.services.stt.base import SttProvider
from app.services.tts.base import TtsProvider
from app.services.tts.welcome import cached_welcome_audio

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/conversation/ask", response_model=AskResponse)
def ask(
    payload: AskRequest,
    conversation: ConversationService = Depends(get_conversation_service),
) -> AskResponse:
    return conversation.ask(payload)


@router.post("/conversation/speak", response_model=SpeakResponse)
def speak(
    payload: SpeakRequest,
    tts: TtsProvider = Depends(get_tts_provider),
) -> SpeakResponse:
    cached = cached_welcome_audio(payload.text, payload.language)
    started = time.perf_counter()
    audio = cached if cached is not None else tts.synthesize(payload.text, language=payload.language)
    tts_ms = int((time.perf_counter() - started) * 1000)
    if payload.turn_id is not None:
        store.set_turn_tts_ms(payload.turn_id, tts_ms)
    logger.info("tts timings turn_id=%s tts_ms=%s chars=%s", payload.turn_id, tts_ms, len(payload.text))
    return SpeakResponse(
        audio_base64=base64.b64encode(audio).decode("ascii") if audio else None,
    )


@router.post("/conversation/transcribe", response_model=TranscribeResponse)
async def transcribe(
    file: UploadFile = File(...),
    stt: SttProvider = Depends(get_stt_provider),
) -> TranscribeResponse:
    audio = await file.read()
    started = time.perf_counter()
    result = stt.transcribe(audio)
    stt_ms = int((time.perf_counter() - started) * 1000)
    logger.info("whisper timings stt_ms=%s chars=%s", stt_ms, len(result.text or ""))
    return TranscribeResponse(
        text=result.text,
        language=result.language,
        stt_ms=stt_ms,
    )
