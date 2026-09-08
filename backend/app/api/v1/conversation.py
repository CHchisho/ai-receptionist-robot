from fastapi import APIRouter, Depends

from app.core.dependencies import get_conversation_service
from app.schemas.conversation import AskRequest, AskResponse
from app.services.conversation import ConversationService

router = APIRouter()


@router.post("/conversation/ask", response_model=AskResponse)
def ask(
    payload: AskRequest,
    conversation: ConversationService = Depends(get_conversation_service),
) -> AskResponse:
    return conversation.ask(payload)
