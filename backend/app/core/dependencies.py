from functools import lru_cache

from app.core.config import settings
from app.services.conversation import ConversationService
from app.services.llm.mock import MockLlmProvider
from app.services.rag.mock import MockRagProvider
from app.services.tts.base import TtsProvider
from app.services.tts.mock import MockTtsProvider
from app.services.tts.piper import PiperTtsProvider


@lru_cache
def get_tts_provider() -> TtsProvider:
    """Build the TTS provider used to synthesize speech.

    Cached so the Piper voice model is loaded once per process, not per request.
    """
    if settings.tts_provider == "piper":
        return PiperTtsProvider(model_path=settings.piper_model_path)
    if settings.tts_provider != "mock":
        raise RuntimeError(f"TTS provider '{settings.tts_provider}' is not wired yet")

    return MockTtsProvider()


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
        tts=get_tts_provider(),
    )
