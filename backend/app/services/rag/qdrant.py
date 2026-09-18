"""Qdrant vector search over ingested documents and approved URLs."""

from __future__ import annotations

import hashlib
import logging
import time
from pathlib import Path
from uuid import uuid5, NAMESPACE_URL

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    FilterSelector,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.services.rag.base import IndexedChunk, KnowledgeSource, RetrievedChunk
from app.services.rag.chunking import chunk_text
from app.services.rag.embeddings import Embedder
from app.services.rag.extract import extract_path, fetch_url

logger = logging.getLogger(__name__)


class QdrantRagProvider:
    def __init__(
        self,
        url: str,
        collection: str,
        embedder: Embedder,
        top_k: int = 5,
        score_threshold: float = 0.25,
        chunk_size: int = 900,
        chunk_overlap: int = 150,
        client: QdrantClient | None = None,
    ) -> None:
        self._client = client or QdrantClient(url=url, timeout=30)
        self._collection = collection
        self._embedder = embedder
        self._top_k = top_k
        self._score_threshold = score_threshold
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap
        self._ready = False

    @classmethod
    def in_memory(cls, embedder: Embedder, **kwargs) -> QdrantRagProvider:
        return cls(
            url="http://unused",
            collection=kwargs.pop("collection", "test"),
            embedder=embedder,
            client=QdrantClient(":memory:"),
            **kwargs,
        )

    def ensure_ready(self) -> None:
        last_error: Exception | None = None
        for _ in range(30):
            try:
                self._client.get_collections()
                break
            except Exception as exc:  # noqa: BLE001 — retry until Qdrant accepts connections
                last_error = exc
                time.sleep(1)
        else:
            raise RuntimeError("Qdrant is not reachable") from last_error

        self._embedder.ensure_ready()
        size = self._embedder.vector_size()
        existing = {item.name for item in self._client.get_collections().collections}
        if self._collection not in existing:
            self._client.create_collection(
                collection_name=self._collection,
                vectors_config=VectorParams(size=size, distance=Distance.COSINE),
            )
        self._ready = True

    def search(self, question: str) -> list[RetrievedChunk]:
        self._ensure_collection()
        query_vector = self._embedder.embed([question])[0]
        results = self._client.query_points(
            collection_name=self._collection,
            query=query_vector,
            limit=self._top_k,
            score_threshold=self._score_threshold,
            with_payload=True,
        )
        chunks: list[RetrievedChunk] = []
        for hit in results.points:
            payload = hit.payload or {}
            chunks.append(
                RetrievedChunk(
                    source_id=str(payload.get("source_id") or hit.id),
                    title=str(payload.get("title") or "Source"),
                    snippet=str(payload.get("snippet") or payload.get("text") or ""),
                    url=payload.get("url"),
                    label=payload.get("label"),
                )
            )
        return chunks

    def list_sources(self) -> list[KnowledgeSource]:
        self._ensure_collection()
        grouped: dict[str, KnowledgeSource] = {}
        offset = None
        while True:
            records, offset = self._client.scroll(
                collection_name=self._collection,
                with_payload=True,
                with_vectors=False,
                limit=128,
                offset=offset,
            )
            for record in records:
                payload = record.payload or {}
                source_id = str(payload.get("source_id") or record.id)
                current = grouped.get(source_id)
                if current is None:
                    grouped[source_id] = KnowledgeSource(
                        source_id=source_id,
                        title=str(payload.get("title") or source_id),
                        kind=str(payload.get("kind") or "unknown"),
                        url=payload.get("url"),
                        chunk_count=1,
                        content_hash=payload.get("content_hash"),
                    )
                else:
                    grouped[source_id] = KnowledgeSource(
                        source_id=current.source_id,
                        title=current.title,
                        kind=current.kind,
                        url=current.url,
                        chunk_count=current.chunk_count + 1,
                        content_hash=current.content_hash,
                    )
            if offset is None:
                break
        return list(grouped.values())

    def ingest_file(self, path: Path, title: str | None = None) -> KnowledgeSource:
        text = extract_path(path)
        source_id = f"file:{path.name}"
        display = title or path.stem
        return self.ingest_text(
            source_id=source_id,
            title=display,
            text=text,
            kind="document",
            url=None,
            label=display,
        )

    def ingest_bytes(
        self,
        filename: str,
        data: bytes,
        title: str | None = None,
    ) -> KnowledgeSource:
        from app.services.rag.extract import extract_pdf

        suffix = Path(filename).suffix.lower()
        if suffix == ".pdf":
            text = extract_pdf(data)
        else:
            text = data.decode("utf-8", errors="replace")
        return self.ingest_text(
            source_id=f"file:{filename}",
            title=title or Path(filename).stem,
            text=text,
            kind="document",
            url=None,
            label=title or Path(filename).stem,
        )

    def ingest_url(
        self,
        url: str,
        label: str | None = None,
        *,
        skip_if_present: bool = False,
    ) -> KnowledgeSource:
        source_id = f"url:{url}"
        if skip_if_present:
            existing = self._existing_source(source_id)
            if existing is not None:
                logger.info("Keeping cached URL source %s", source_id)
                return existing
        title, text = fetch_url(url)
        return self.ingest_text(
            source_id=source_id,
            title=label or title,
            text=text,
            kind="url",
            url=url,
            label=label or title,
        )

    def ingest_text(
        self,
        source_id: str,
        title: str,
        text: str,
        kind: str,
        url: str | None,
        label: str | None,
    ) -> KnowledgeSource:
        self._ensure_collection()
        chunks = chunk_text(text, size=self._chunk_size, overlap=self._chunk_overlap)
        if not chunks:
            raise ValueError(f"No text extracted from {source_id}")

        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        if self._source_hash_matches(source_id, content_hash):
            logger.info("Skipping unchanged source %s", source_id)
            return KnowledgeSource(
                source_id=source_id,
                title=title,
                kind=kind,
                url=url,
                chunk_count=len(chunks),
                content_hash=content_hash,
            )

        vectors = self._embedder.embed(chunks)
        self._client.delete(
            collection_name=self._collection,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[FieldCondition(key="source_id", match=MatchValue(value=source_id))]
                )
            ),
        )
        points = []
        for index, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True)):
            points.append(
                PointStruct(
                    id=str(uuid5(NAMESPACE_URL, f"{source_id}:{index}")),
                    vector=vector,
                    payload={
                        "source_id": source_id,
                        "title": title,
                        "text": chunk,
                        "snippet": chunk[:400],
                        "kind": kind,
                        "url": url,
                        "label": label or title,
                        "content_hash": content_hash,
                        "chunk_index": index,
                    },
                )
            )
        self._client.upsert(collection_name=self._collection, points=points)
        logger.info("Indexed %s (%s chunks)", source_id, len(points))
        return KnowledgeSource(
            source_id=source_id,
            title=title,
            kind=kind,
            url=url,
            chunk_count=len(points),
            content_hash=content_hash,
        )

    def delete_source(self, source_id: str) -> None:
        self._ensure_collection()
        self._client.delete(
            collection_name=self._collection,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[FieldCondition(key="source_id", match=MatchValue(value=source_id))]
                )
            ),
        )

    def update_source_label(self, source_id: str, title: str) -> None:
        self._ensure_collection()
        self._client.set_payload(
            collection_name=self._collection,
            payload={"title": title, "label": title},
            points=Filter(
                must=[FieldCondition(key="source_id", match=MatchValue(value=source_id))]
            ),
        )

    def list_chunks(self, source_id: str) -> list[IndexedChunk]:
        self._ensure_collection()
        chunks: list[IndexedChunk] = []
        offset = None
        while True:
            records, offset = self._client.scroll(
                collection_name=self._collection,
                scroll_filter=Filter(
                    must=[FieldCondition(key="source_id", match=MatchValue(value=source_id))]
                ),
                with_payload=True,
                with_vectors=True,
                limit=64,
                offset=offset,
            )
            for record in records:
                payload = record.payload or {}
                vector = record.vector
                if isinstance(vector, dict):
                    vector = next(iter(vector.values()), None)
                chunks.append(
                    IndexedChunk(
                        source_id=source_id,
                        chunk_index=int(payload.get("chunk_index") or 0),
                        text=str(payload.get("text") or payload.get("snippet") or ""),
                        vector=list(vector) if vector else None,
                    )
                )
            if offset is None:
                break
        chunks.sort(key=lambda item: item.chunk_index)
        return chunks

    def _existing_source(self, source_id: str) -> KnowledgeSource | None:
        for item in self.list_sources():
            if item.source_id == source_id:
                return item
        return None

    def _source_hash_matches(self, source_id: str, content_hash: str) -> bool:
        records, _ = self._client.scroll(
            collection_name=self._collection,
            scroll_filter=Filter(
                must=[FieldCondition(key="source_id", match=MatchValue(value=source_id))]
            ),
            limit=1,
            with_payload=True,
            with_vectors=False,
        )
        if not records:
            return False
        payload = records[0].payload or {}
        return payload.get("content_hash") == content_hash

    def _ensure_collection(self) -> None:
        if not self._ready:
            self.ensure_ready()
