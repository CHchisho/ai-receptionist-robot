from app.services.rag.base import KnowledgeSource, RetrievedChunk


class MockRagProvider:
    """Returns no knowledge-base hits until Qdrant ingestion exists."""

    def search(self, question: str) -> list[RetrievedChunk]:  # noqa: ARG002
        return []

    def list_sources(self) -> list[KnowledgeSource]:
        return []
