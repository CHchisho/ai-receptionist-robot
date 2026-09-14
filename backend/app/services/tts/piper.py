"""Piper adapter for local text-to-speech."""

from __future__ import annotations

import io
import logging
import wave
from pathlib import Path

logger = logging.getLogger(__name__)


def ensure_piper_voice(model_path: str) -> Path:
    """Download the Piper voice pair (.onnx + .onnx.json) when missing."""
    path = Path(model_path)
    config_path = Path(f"{path}.json")
    if path.is_file() and config_path.is_file():
        return path

    path.parent.mkdir(parents=True, exist_ok=True)
    voice_name = path.name.removesuffix(".onnx")
    logger.info("Downloading Piper voice '%s' into %s", voice_name, path.parent)

    from piper.download_voices import download_voice

    download_voice(voice_name, path.parent)
    if not path.is_file() or not config_path.is_file():
        raise FileNotFoundError(
            f"Piper voice '{voice_name}' was not downloaded to {path.parent}"
        )
    return path


class PiperTtsProvider:
    """Synthesizes speech locally using Piper.

    The voice model is loaded once and reused for every request.
    """

    def __init__(self, model_path: str) -> None:
        from piper import PiperVoice  # imported lazily so mock mode needs no model deps

        self._voice = PiperVoice.load(model_path)

    def synthesize(self, text: str) -> bytes:
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            self._voice.synthesize_wav(text, wav_file)
        return buffer.getvalue()
