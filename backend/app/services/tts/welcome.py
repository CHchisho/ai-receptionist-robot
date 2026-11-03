"""Lena's opening line, synthesized once and reused for every visitor."""

from __future__ import annotations

import logging

from app.services.tts.base import TtsProvider

logger = logging.getLogger(__name__)

# Keep in sync with WELCOME_MESSAGE in frontend useConversation.ts.
WELCOME_TEXT = (
    "Hello, I am Lena. Ask me about Nokia Espoo, the Innovation Garage, "
    "or how to find your way."
)
WELCOME_LANGUAGE = "en"

_audio: bytes | None = None


def prepare_welcome_audio(tts: TtsProvider) -> None:
    """Synthesize the opening line and keep the bytes for later playback."""
    global _audio
    logger.info("Synthesizing welcome message")
    audio = tts.synthesize(WELCOME_TEXT, language=WELCOME_LANGUAGE)
    _audio = audio
    logger.info("Welcome message ready (%s bytes)", len(audio))


def cached_welcome_audio(text: str, language: str) -> bytes | None:
    """Return the prepared clip when the request is the opening line."""
    if _audio is None:
        return None
    if language != WELCOME_LANGUAGE or text != WELCOME_TEXT:
        return None
    return _audio
