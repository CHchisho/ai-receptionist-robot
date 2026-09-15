class MockSttProvider:
    """Default STT provider; used unless STT_PROVIDER=whisper."""

    def transcribe(self, audio: bytes) -> str:
        return "transcribed question"
