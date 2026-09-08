from typing import Protocol


class SttProvider(Protocol):
    def transcribe(self, audio: bytes) -> str: ...
