from __future__ import annotations

import logging
from pathlib import Path

from app.core.config import Settings
from app.services.rag.qdrant import QdrantRagProvider

logger = logging.getLogger(__name__)

_DOCUMENT_SUFFIXES = {".pdf", ".txt", ".md"}


def ingest_configured_sources(rag: QdrantRagProvider, settings: Settings) -> None:
    """Index seed files and approved URLs. Failures are logged, not fatal."""
    documents_dir = settings.knowledge_documents_path
    if documents_dir.is_dir():
        for path in sorted(documents_dir.rglob("*")):
            if path.is_file() and path.suffix.lower() in _DOCUMENT_SUFFIXES:
                try:
                    rag.ingest_file(path)
                except Exception:
                    logger.exception("Failed to ingest document %s", path)
    else:
        logger.info("Knowledge documents directory missing: %s", documents_dir)

    for url in settings.knowledge_url_list:
        try:
            rag.ingest_url(url, skip_if_present=not settings.knowledge_refresh)
        except Exception:
            logger.exception("Failed to ingest URL %s", url)
