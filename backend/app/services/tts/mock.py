class MockTtsProvider:
    """Default TTS provider; used unless TTS_PROVIDER is piper or chatterbox."""

    def synthesize(self, text: str, language: str) -> bytes:
        return b""
