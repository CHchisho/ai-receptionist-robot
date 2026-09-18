import base64

from fastapi import APIRouter, Depends, File, UploadFile

from app.core.dependencies import get_conversation_service, get_stt_provider
from app.core.dependencies import get_tts_provider
from app.schemas.conversation import AskRequest, AskResponse, SpeakRequest, SpeakResponse, TranscribeResponse
from app.services.conversation import ConversationService
from app.services.stt.base import SttProvider
from app.services.tts.base import TtsProvider

router = APIRouter()


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
    audio = tts.synthesize(payload.text)
    return SpeakResponse(
        audio_base64=base64.b64encode(audio).decode("ascii") if audio else None,
    )


@router.post("/conversation/transcribe", response_model=TranscribeResponse)
async def transcribe(
    file: UploadFile = File(...),
    stt: SttProvider = Depends(get_stt_provider),
) -> TranscribeResponse:
    audio = await file.read()
    text = stt.transcribe(audio)
    return TranscribeResponse(text=text)
