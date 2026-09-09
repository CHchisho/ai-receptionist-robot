from functools import lru_cache

from app.core.config import settings
from app.services.conversation import ConversationService
from app.services.llm.mock import MockLlmProvider
from app.services.rag.mock import MockRagProvider
from app.services.stt.base import SttProvider
from app.services.stt.mock import MockSttProvider
from app.services.stt.whisper import WhisperSttProvider


def get_conversation_service() -> ConversationService:
    """Build the conversation pipeline from configured providers.

    Swap mock implementations for Ollama / Qdrant without changing the API layer.
    """
    if settings.llm_provider != "mock":
        raise RuntimeError(f"LLM provider '{settings.llm_provider}' is not wired yet")
    if settings.rag_provider != "mock":
        raise RuntimeError(f"RAG provider '{settings.rag_provider}' is not wired yet")

    return ConversationService(
        llm=MockLlmProvider(),
        rag=MockRagProvider(),
    )


@lru_cache
def get_stt_provider() -> SttProvider:
    """Build the STT provider used to transcribe recorded audio.

    Cached so the whisper model is loaded once per process, not per request.
    """
    if settings.stt_provider == "whisper":
        return WhisperSttProvider(
            model_size=settings.whisper_model_size,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
    if settings.stt_provider != "mock":
        raise RuntimeError(f"STT provider '{settings.stt_provider}' is not wired yet")

    return MockSttProvider()
