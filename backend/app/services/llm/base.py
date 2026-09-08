from typing import Protocol


class LlmProvider(Protocol):
    def generate(self, question: str, context: list) -> str: ...
