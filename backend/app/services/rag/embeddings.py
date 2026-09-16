from __future__ import annotations

import logging
from typing import Protocol

import httpx

logger = logging.getLogger(__name__)


class Embedder(Protocol):
    def vector_size(self) -> int: ...

    def embed(self, texts: list[str]) -> list[list[float]]: ...

    def ensure_ready(self) -> None: ...


class OllamaEmbedder:
    """Local embeddings via Ollama (`/api/embed`, nomic-embed-text by default)."""

    def __init__(
        self,
        base_url: str,
        model: str,
        timeout_seconds: float = 120.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._client = httpx.Client(
            base_url=self._base_url,
            timeout=httpx.Timeout(10.0, read=timeout_seconds),
        )
        self._vector_size: int | None = None

    def ensure_ready(self) -> None:
        tags = self._client.get("/api/tags")
        tags.raise_for_status()
        names = [item.get("name", "") for item in tags.json().get("models", [])]
        present = any(name == self._model or name.split(":")[0] == self._model.split(":")[0] for name in names)
        if not present:
            logger.info("Pulling embedding model '%s'", self._model)
            pull = self._client.post(
                "/api/pull",
                json={"name": self._model, "stream": False},
                timeout=None,
            )
            pull.raise_for_status()
        self.vector_size()

    def vector_size(self) -> int:
        if self._vector_size is None:
            vectors = self.embed(["dimension probe"])
            self._vector_size = len(vectors[0])
        return self._vector_size

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        vectors: list[list[float]] = []
        batch_size = 16
        for start in range(0, len(texts), batch_size):
            batch = texts[start : start + batch_size]
            vectors.extend(self._embed_batch(batch))
        return vectors

    def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        response = self._client.post("/api/embed", json={"model": self._model, "input": texts})
        if response.status_code == 404:
            return [self._embed_one_legacy(text) for text in texts]
        response.raise_for_status()
        payload = response.json()
        embeddings = payload.get("embeddings")
        if not embeddings:
            raise RuntimeError("Ollama embed returned no vectors")
        return embeddings

    def _embed_one_legacy(self, text: str) -> list[float]:
        response = self._client.post("/api/embeddings", json={"model": self._model, "prompt": text})
        response.raise_for_status()
        vector = response.json().get("embedding")
        if not vector:
            raise RuntimeError("Ollama embeddings returned an empty vector")
        return vector
