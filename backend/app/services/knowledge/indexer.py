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


def optional_title(
    stored: str | None,
    *,
    url: str | None = None,
    filename: str | None = None,
) -> str | None:
    """A title the admin typed. A copied URL or file name does not count."""
    text = (stored or "").strip()
    if not text:
        return None
    if url and text == url.strip():
        return None
    if filename and text == Path(filename).stem:
        return None
    return text


def visitor_label(
    stored: str | None,
    page_title: str | None,
    *,
    url: str | None = None,
    filename: str | None = None,
) -> str:
    custom = optional_title(stored, url=url, filename=filename)
    if custom:
        return custom
    heading = (page_title or "").strip()
    if heading:
        return heading
    if filename:
        return Path(filename).stem
    return (url or "").strip()


def catalog(rag: QdrantRagProvider) -> list[dict]:
    indexed = {item.source_id: item for item in rag.list_sources()}
    items = []
    for record in store.list_sources():
        qdrant = indexed.get(record.source_id)
        stale, reason = _stale(record, qdrant)
        custom = optional_title(record.title, url=record.url, filename=record.filename)
        items.append(
            {
                "source_id": record.source_id,
                "kind": record.kind,
                "title": custom,
                "page_title": _page_heading(record, qdrant),
                "url": record.url,
                "filename": record.filename,
                "chunk_count": qdrant.chunk_count if qdrant else 0,
                "stale": stale,
                "stale_reason": reason,
            }
        )
    return items


def add_url(rag: QdrantRagProvider, url: str, label: str | None) -> dict:
    custom = optional_title(label, url=url)
    indexed = rag.ingest_url(url, label=custom, skip_if_present=False)
    store.upsert_source(
        source_id=indexed.source_id,
        kind="url",
        title=custom or "",
        url=url,
        content_hash=indexed.content_hash,
        page_title=indexed.page_title,
    )
    return _one(rag, indexed.source_id)


def add_file(rag: QdrantRagProvider, filename: str, data: bytes, label: str | None = None) -> dict:
    documents = settings.knowledge_documents_path
    documents.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename).name
    path = documents / safe_name
    path.write_bytes(data)
    custom = optional_title(label, filename=safe_name)
    indexed = rag.ingest_file(path, title=custom)
    store.upsert_source(
        source_id=indexed.source_id,
        kind="document",
        title=custom or "",
        filename=safe_name,
        file_hash=store.file_sha256(path),
        content_hash=indexed.content_hash,
        page_title=indexed.page_title,
    )
    return _one(rag, indexed.source_id)


def rename_source(rag: QdrantRagProvider, source_id: str, title: str) -> dict:
    record = store.get_source(source_id)
    if record is None:
        raise KeyError(source_id)
    indexed = {item.source_id: item for item in rag.list_sources()}
    custom = optional_title(title, url=record.url, filename=record.filename)
    page = _page_heading(record, indexed.get(source_id))
    shown = visitor_label(custom, page, url=record.url, filename=record.filename)
    rag.update_source_label(source_id, shown, page_title=page or None)
    store.upsert_source(
        source_id=record.source_id,
        kind=record.kind,
        title=custom or "",
        url=record.url,
        filename=record.filename,
        file_hash=record.file_hash,
        content_hash=record.content_hash,
        page_title=page or None,
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
                custom = (
                    optional_title(existing.title, filename=existing.filename)
                    if existing
                    else None
                )
                indexed = rag.ingest_file(path, title=custom)
                store.upsert_source(
                    source_id=indexed.source_id,
                    kind="document",
                    title=custom or "",
                    filename=path.name,
                    file_hash=store.file_sha256(path),
                    content_hash=indexed.content_hash,
                    page_title=indexed.page_title,
                )

    for record in store.list_sources():
        if record.kind != "url" or not record.url:
            continue
        custom = optional_title(record.title, url=record.url)
        indexed = rag.ingest_url(record.url, label=custom, skip_if_present=False)
        store.upsert_source(
            source_id=indexed.source_id,
            kind="url",
            title=custom or "",
            url=record.url,
            content_hash=indexed.content_hash,
            page_title=indexed.page_title,
        )


def sync_catalog_after_boot(rag: QdrantRagProvider) -> None:
    """Register whatever bootstrap just indexed so Admin has a catalog."""
    documents = settings.knowledge_documents_path
    if documents.is_dir():
        for path in sorted(documents.rglob("*")):
            if path.is_file() and path.suffix.lower() in _DOCUMENT_SUFFIXES:
                source_id = f"file:{path.name}"
                existing = store.get_source(source_id)
                custom = (
                    optional_title(existing.title, filename=existing.filename)
                    if existing
                    else None
                )
                store.upsert_source(
                    source_id=source_id,
                    kind="document",
                    title=custom or "",
                    filename=path.name,
                    file_hash=store.file_sha256(path),
                    page_title=None if existing and existing.page_title else path.stem,
                )
    for url in settings.knowledge_url_list:
        source_id = f"url:{url}"
        if store.get_source(source_id) is None:
            store.upsert_source(source_id=source_id, kind="url", title="", url=url)
    for item in rag.list_sources():
        existing = store.get_source(item.source_id)
        if existing:
            custom = optional_title(existing.title, url=existing.url, filename=existing.filename)
            store.upsert_source(
                source_id=existing.source_id,
                kind=existing.kind,
                title=custom or "",
                url=item.url or existing.url,
                filename=existing.filename,
                file_hash=existing.file_hash,
                content_hash=item.content_hash,
                page_title=_page_heading(existing, item) or None,
            )


def _page_heading(record, qdrant) -> str:
    stored = (getattr(record, "page_title", None) or "").strip()
    if stored:
        return stored
    indexed = (getattr(qdrant, "page_title", None) or "").strip()
    if indexed:
        return indexed
    custom = optional_title(
        getattr(record, "title", None),
        url=getattr(record, "url", None),
        filename=getattr(record, "filename", None),
    )
    indexed_title = (getattr(qdrant, "title", None) or "").strip()
    url = (getattr(record, "url", None) or "").strip()
    if not custom and indexed_title and indexed_title != url:
        return indexed_title
    filename = getattr(record, "filename", None)
    if filename:
        return Path(filename).stem
    return ""


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
