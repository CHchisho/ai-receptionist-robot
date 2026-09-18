"""Ollama adapter for the local LLM."""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from app.services.llm.prompt import SYSTEM_PROMPT, build_user_prompt

logger = logging.getLogger(__name__)


class OllamaLlmProvider:
    """Generates answers via a local Ollama server."""

    def __init__(
        self,
        base_url: str,
        model: str,
        timeout_seconds: float = 300.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._client = httpx.Client(
            base_url=self._base_url,
            timeout=httpx.Timeout(10.0, read=timeout_seconds),
        )

    def wait_until_ready(self, attempts: int = 60, delay_seconds: float = 2.0) -> None:
        last_error: Exception | None = None
        for _ in range(attempts):
            try:
                response = self._client.get("/api/tags")
                response.raise_for_status()
                return
            except httpx.HTTPError as exc:
                last_error = exc
                time.sleep(delay_seconds)
        raise RuntimeError(f"Ollama is not reachable at {self._base_url}") from last_error

    def ensure_model(self) -> None:
        """Pull the configured model when it is not already present on the server."""
        if self._model_is_present():
            logger.info("Ollama model '%s' is already available", self._model)
            return

        logger.info("Pulling Ollama model '%s' (first start can take several minutes)", self._model)
        response = self._client.post(
            "/api/pull",
            json={"name": self._model, "stream": False},
            timeout=None,
        )
        response.raise_for_status()
        if not self._model_is_present():
            raise RuntimeError(f"Ollama model '{self._model}' was not available after pull")

    def ensure_ready(self) -> None:
        self.wait_until_ready()
        self.ensure_model()

    def generate(self, question: str, context: list) -> str:
        response = self._client.post(
            "/api/chat",
            json={
                "model": self._model,
                "stream": False,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": build_user_prompt(question, context)},
                ],
            },
        )
        response.raise_for_status()
        payload: dict[str, Any] = response.json()
        message = payload.get("message") or {}
        content = (message.get("content") or "").strip()
        if not content:
            raise RuntimeError("Ollama returned an empty response")
        return content

    def _model_is_present(self) -> bool:
        response = self._client.get("/api/tags")
        response.raise_for_status()
        names = [item.get("name", "") for item in response.json().get("models", [])]
        return any(self._names_match(name, self._model) for name in names)

    @staticmethod
    def _names_match(available: str, wanted: str) -> bool:
        if available == wanted:
            return True
        # `llama3.2` matches `llama3.2:latest`
        if ":" not in wanted and available.split(":")[0] == wanted:
            return True
        return False
