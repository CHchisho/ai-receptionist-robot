from app.services.stt.base import SttResult


class MockSttProvider:
    """Default STT provider; used unless STT_PROVIDER=whisper."""

    def transcribe(self, audio: bytes) -> SttResult:
        return SttResult(
            text="transcribed question",
            language="en",
        )