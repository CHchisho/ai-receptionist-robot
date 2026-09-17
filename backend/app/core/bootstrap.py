"""Download and load configured AI assets the first time the API starts."""

from __future__ import annotations

import logging

from app.core.config import settings
from app.core.dependencies import get_llm_provider, get_rag_provider, get_stt_provider, get_tts_provider
from app.services.tts.piper import ensure_piper_voice

logger = logging.getLogger(__name__)


def bootstrap() -> None:
    """Prepare providers selected in env. Mock providers need no downloads."""
    if settings.llm_provider == "ollama":
        logger.info("Preparing Ollama model '%s'", settings.ollama_model)
        llm = get_llm_provider()
        ensure_ready = getattr(llm, "ensure_ready", None)
        if callable(ensure_ready):
            ensure_ready()

    if settings.tts_provider == "piper":
        logger.info("Preparing Piper voice at %s", settings.piper_model_path)
        ensure_piper_voice(settings.piper_model_path)
        get_tts_provider()

    if settings.stt_provider == "whisper":
        logger.info("Loading Whisper model '%s'", settings.whisper_model_size)
        get_stt_provider()

    if settings.rag_provider == "qdrant":
        logger.info("Preparing Qdrant collection '%s'", settings.qdrant_collection)
        rag = get_rag_provider()
        ensure_ready = getattr(rag, "ensure_ready", None)
        if callable(ensure_ready):
            ensure_ready()
        from app.services.rag.ingest import ingest_configured_sources
        from app.services.rag.qdrant import QdrantRagProvider

        if isinstance(rag, QdrantRagProvider):
            ingest_configured_sources(rag, settings)
            from app.services.knowledge.indexer import sync_catalog_after_boot

            sync_catalog_after_boot(rag)
