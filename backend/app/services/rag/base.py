from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class RetrievedChunk:
    source_id: str
    title: str
    snippet: str


class RagProvider(Protocol):
    def search(self, question: str) -> list[RetrievedChunk]: ...
