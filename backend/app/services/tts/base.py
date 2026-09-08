from typing import Protocol


class TtsProvider(Protocol):
    def synthesize(self, text: str) -> bytes: ...
