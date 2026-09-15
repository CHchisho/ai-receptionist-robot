class MockTtsProvider:
    """Default TTS provider; used unless TTS_PROVIDER=piper."""

    def synthesize(self, text: str) -> bytes:
        return b""
