from uuid import uuid4

from app.schemas.conversation import AskRequest, AskResponse, SourceChunk
from app.services.llm.base import LlmProvider
from app.services.rag.base import RagProvider


class ConversationService:
    """Orchestrates question → retrieval → LLM. STT/TTS join this path later."""

    def __init__(self, llm: LlmProvider, rag: RagProvider) -> None:
        self._llm = llm
        self._rag = rag

    def ask(self, payload: AskRequest) -> AskResponse:
        session_id = payload.session_id or str(uuid4())
        chunks = self._rag.search(payload.text)
        answer = self._llm.generate(question=payload.text, context=chunks)
        return AskResponse(
            session_id=session_id,
            answer=answer,
            links=[],
            sources=[
                SourceChunk(source_id=c.source_id, title=c.title, snippet=c.snippet)
                for c in chunks
            ],
        )
