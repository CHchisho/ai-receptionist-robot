from fastapi import APIRouter, Depends, File, UploadFile

from app.core.dependencies import get_conversation_service, get_stt_provider
from app.schemas.conversation import AskRequest, AskResponse, TranscribeResponse
from app.services.conversation import ConversationService
from app.services.stt.base import SttProvider

router = APIRouter()


@router.post("/conversation/ask", response_model=AskResponse)
def ask(
    payload: AskRequest,
    conversation: ConversationService = Depends(get_conversation_service),
) -> AskResponse:
    return conversation.ask(payload)


@router.post("/conversation/transcribe", response_model=TranscribeResponse)
async def transcribe(
    file: UploadFile = File(...),
    stt: SttProvider = Depends(get_stt_provider),
) -> TranscribeResponse:
    audio = await file.read()
    text = stt.transcribe(audio)
    return TranscribeResponse(text=text)
