"""Ollama adapter — implement generate() when the local model is available."""


class OllamaLlmProvider:
    def generate(self, question: str, context: list) -> str:
        raise NotImplementedError("Ollama LLM provider is not implemented yet")
