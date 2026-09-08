class MockNavigationProvider:
    """Structured indoor directions will live here, not only in the LLM."""

    def find(self, query: str) -> str | None:
        return None
