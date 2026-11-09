"""Lena's opening line, synthesized once and reused until an admin changes it."""

from __future__ import annotations

import logging

from app.services.tts.base import TtsProvider

logger = logging.getLogger(__name__)

WELCOME_LANGUAGE = "en"

_text: str | None = None
_audio: bytes | None = None


def prepare_welcome_audio(tts: TtsProvider) -> None:
    """Synthesize the saved opening line and keep the bytes for later playback."""
    from app.services.knowledge import store

    _synthesize(tts, store.get_welcome_text())


def replace_welcome_audio(tts: TtsProvider, text: str) -> str:
    """Store a new opening line and synthesize it when the wording changed."""
    from app.services.knowledge import store

    cleaned = text.strip()
    if cleaned == _text and _audio is not None:
        return cleaned
    store.set_welcome_text(cleaned)
    _synthesize(tts, cleaned)
    return cleaned


def welcome_clip() -> tuple[str, bytes | None]:
    """Return the current opening line and its prepared audio, if ready."""
    from app.services.knowledge import store

    if _text is not None:
        return _text, _audio
    return store.get_welcome_text(), None


def cached_welcome_audio(text: str, language: str) -> bytes | None:
    """Return the prepared clip when the request is the current opening line."""
    if _audio is None or _text is None:
        return None
    if language != WELCOME_LANGUAGE or text != _text:
        return None
    return _audio


def _synthesize(tts: TtsProvider, text: str) -> None:
    global _text, _audio
    logger.info("Synthesizing welcome message")
    _text = text
    _audio = None
    audio = tts.synthesize(text, language=WELCOME_LANGUAGE)
    _audio = audio
    logger.info("Welcome message ready (%s bytes)", len(audio))
