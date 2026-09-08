from app.core.config import settings
from app.services.conversation import ConversationService
from app.services.llm.mock import MockLlmProvider
from app.services.rag.mock import MockRagProvider
from app.services.stt.base import SttProvider
from app.services.stt.mock import MockSttProvider


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


def get_stt_provider() -> SttProvider:
    """Build the STT provider used to transcribe recorded audio."""
    if settings.stt_provider != "mock":
        raise RuntimeError(f"STT provider '{settings.stt_provider}' is not wired yet")

    return MockSttProvider()
