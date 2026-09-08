"""Qdrant vector search — implement after embeddings and ingestion exist."""

from app.services.rag.base import RetrievedChunk


class QdrantRagProvider:
    def search(self, question: str) -> list[RetrievedChunk]:
        raise NotImplementedError("Qdrant RAG provider is not implemented yet")
