from __future__ import annotations

import logging
import threading
from pathlib import Path

from app.core.config import settings
from app.services.knowledge import store
from app.services.rag.qdrant import QdrantRagProvider

logger = logging.getLogger(__name__)

_DOCUMENT_SUFFIXES = {".pdf", ".txt", ".md"}
_lock = threading.Lock()
_indexing = False
_index_error: str | None = None


def status() -> dict:
    return {"indexing": _indexing, "error": _index_error}


def catalog(rag: QdrantRagProvider) -> list[dict]:
    indexed = {item.source_id: item for item in rag.list_sources()}
    items = []
    for record in store.list_sources():
        qdrant = indexed.get(record.source_id)
        stale, reason = _stale(record, qdrant)
        items.append(
            {
                "source_id": record.source_id,
                "kind": record.kind,
                "title": record.title,
                "url": record.url,
                "filename": record.filename,
                "chunk_count": qdrant.chunk_count if qdrant else 0,
                "stale": stale,
                "stale_reason": reason,
            }
        )
    return items


def add_url(rag: QdrantRagProvider, url: str, label: str | None) -> dict:
    indexed = rag.ingest_url(url, label=label, skip_if_present=False)
    store.upsert_source(
        source_id=indexed.source_id,
        kind="url",
        title=indexed.title,
        url=url,
        content_hash=indexed.content_hash,
    )
    return _one(rag, indexed.source_id)


def add_file(rag: QdrantRagProvider, filename: str, data: bytes, label: str | None = None) -> dict:
    documents = settings.knowledge_documents_path
    documents.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename).name
    path = documents / safe_name
    path.write_bytes(data)
    indexed = rag.ingest_file(path, title=label)
    store.upsert_source(
        source_id=indexed.source_id,
        kind="document",
        title=indexed.title,
        filename=safe_name,
        file_hash=store.file_sha256(path),
        content_hash=indexed.content_hash,
    )
    return _one(rag, indexed.source_id)


def rename_source(rag: QdrantRagProvider, source_id: str, title: str) -> dict:
    record = store.get_source(source_id)
    if record is None:
        raise KeyError(source_id)
    rag.update_source_label(source_id, title)
    store.upsert_source(
        source_id=record.source_id,
        kind=record.kind,
        title=title,
        url=record.url,
        filename=record.filename,
        file_hash=record.file_hash,
        content_hash=record.content_hash,
    )
    return _one(rag, source_id)


def remove_source(rag: QdrantRagProvider, source_id: str) -> None:
    record = store.get_source(source_id)
    rag.delete_source(source_id)
    if record and record.kind == "document" and record.filename:
        path = settings.knowledge_documents_path / record.filename
        if path.exists():
            path.unlink()
    store.delete_source(source_id)


def start_reindex(rag: QdrantRagProvider) -> bool:
    global _indexing, _index_error
    with _lock:
        if _indexing:
            return False
        _indexing = True
        _index_error = None

    def run() -> None:
        global _indexing, _index_error
        try:
            reindex_all(rag)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Knowledge reindex failed")
            _index_error = str(exc)
        finally:
            _indexing = False

    threading.Thread(target=run, daemon=True).start()
    return True


def reindex_all(rag: QdrantRagProvider) -> None:
    documents = settings.knowledge_documents_path
    if documents.is_dir():
        for path in sorted(documents.rglob("*")):
            if path.is_file() and path.suffix.lower() in _DOCUMENT_SUFFIXES:
                existing = store.get_source(f"file:{path.name}")
                indexed = rag.ingest_file(path, title=existing.title if existing else None)
                store.upsert_source(
                    source_id=indexed.source_id,
                    kind="document",
                    title=existing.title if existing else indexed.title,
                    filename=path.name,
                    file_hash=store.file_sha256(path),
                    content_hash=indexed.content_hash,
                )

    for record in store.list_sources():
        if record.kind != "url" or not record.url:
            continue
        indexed = rag.ingest_url(record.url, label=record.title, skip_if_present=False)
        store.upsert_source(
            source_id=indexed.source_id,
            kind="url",
            title=record.title,
            url=record.url,
            content_hash=indexed.content_hash,
        )


def sync_catalog_after_boot(rag: QdrantRagProvider) -> None:
    """Register whatever bootstrap just indexed so Admin has a catalog."""
    documents = settings.knowledge_documents_path
    if documents.is_dir():
        for path in sorted(documents.rglob("*")):
            if path.is_file() and path.suffix.lower() in _DOCUMENT_SUFFIXES:
                source_id = f"file:{path.name}"
                store.upsert_source(
                    source_id=source_id,
                    kind="document",
                    title=path.stem,
                    filename=path.name,
                    file_hash=store.file_sha256(path),
                )
    for url in settings.knowledge_url_list:
        store.upsert_source(source_id=f"url:{url}", kind="url", title=url, url=url)
    for item in rag.list_sources():
        existing = store.get_source(item.source_id)
        if existing:
            store.upsert_source(
                source_id=existing.source_id,
                kind=existing.kind,
                title=existing.title or item.title,
                url=item.url or existing.url,
                filename=existing.filename,
                file_hash=existing.file_hash,
                content_hash=item.content_hash,
            )


def _stale(record, qdrant) -> tuple[bool, str | None]:
    if qdrant is None or qdrant.chunk_count == 0:
        return True, "Not in the search index yet"
    if record.kind == "document" and record.filename:
        path = settings.knowledge_documents_path / record.filename
        if not path.exists():
            return True, "File is missing"
        if record.file_hash and store.file_sha256(path) != record.file_hash:
            return True, "File changed on disk"
    return False, None


def _one(rag: QdrantRagProvider, source_id: str) -> dict:
    for item in catalog(rag):
        if item["source_id"] == source_id:
            return item
    raise KeyError(source_id)
