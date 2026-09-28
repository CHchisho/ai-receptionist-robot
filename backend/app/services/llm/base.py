from typing import Protocol


class LlmProvider(Protocol):
    def generate(
        self,
        question: str,
        context: list,
        history: list | None = None,
        language: str = "en",
    ) -> str: ...