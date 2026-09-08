class MockTtsProvider:
    """Stand-in until Piper generates speech audio."""

    def synthesize(self, text: str) -> bytes:
        return b""
