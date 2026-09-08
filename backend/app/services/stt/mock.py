class MockSttProvider:
    """Stand-in until faster-whisper is wired to microphone audio."""

    def transcribe(self, audio: bytes) -> str:
        return "transcribed question"
