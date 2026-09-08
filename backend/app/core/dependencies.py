from app.core.config import settings
from app.services.conversation import ConversationService
from app.services.llm.mock import MockLlmProvider
from app.services.rag.mock import MockRagProvider


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
