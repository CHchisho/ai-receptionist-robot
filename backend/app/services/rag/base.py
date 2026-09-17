from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class RetrievedChunk:
    source_id: str
    title: str
    snippet: str
    url: str | None = None
    label: str | None = None


@dataclass(frozen=True)
class KnowledgeSource:
    source_id: str
    title: str
    kind: str
    url: str | None = None
    chunk_count: int = 0
    content_hash: str | None = None


@dataclass(frozen=True)
class IndexedChunk:
    source_id: str
    chunk_index: int
    text: str
    vector: list[float] | None = None


class RagProvider(Protocol):
    def search(self, question: str) -> list[RetrievedChunk]: ...

    def list_sources(self) -> list[KnowledgeSource]: ...
