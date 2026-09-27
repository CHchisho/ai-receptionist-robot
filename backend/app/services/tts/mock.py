class MockTtsProvider:
    """Default TTS provider; used unless TTS_PROVIDER=piper."""

    def synthesize(self, text: str, language: str) -> bytes:
        return b""
