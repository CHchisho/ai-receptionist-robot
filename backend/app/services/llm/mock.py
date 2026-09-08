class MockLlmProvider:
    """Stand-in for the local Ollama LLM until the real model is connected."""

    def generate(self, question: str, context: list) -> str:  # noqa: ARG002
        return "AI answer"
