from dataclasses import dataclass
from typing import Protocol


@dataclass
class SttResult:
    text: str
    language: str


class SttProvider(Protocol):
    def transcribe(self, audio: bytes) -> SttResult: ...