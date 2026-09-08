import base64
from uuid import uuid4

from app.schemas.conversation import AskRequest, AskResponse, SourceChunk
from app.services.llm.base import LlmProvider
from app.services.rag.base import RagProvider
from app.services.tts.base import TtsProvider


class ConversationService:
    """Orchestrates question → retrieval → LLM → TTS. STT joins this path later."""

    def __init__(self, llm: LlmProvider, rag: RagProvider, tts: TtsProvider) -> None:
        self._llm = llm
        self._rag = rag
        self._tts = tts

    def ask(self, payload: AskRequest) -> AskResponse:
        session_id = payload.session_id or str(uuid4())
        chunks = self._rag.search(payload.text)
        answer = self._llm.generate(question=payload.text, context=chunks)
        audio = self._tts.synthesize(answer)
        return AskResponse(
            session_id=session_id,
            answer=answer,
            audio_base64=base64.b64encode(audio).decode("ascii") if audio else None,
            links=[],
            sources=[
                SourceChunk(source_id=c.source_id, title=c.title, snippet=c.snippet)
                for c in chunks
            ],
        )
