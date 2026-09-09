"""Piper adapter for local text-to-speech."""

import io
import wave

from piper import PiperVoice


class PiperTtsProvider:
    """Synthesizes speech locally using Piper.

    The voice model is loaded once and reused for every request.
    """

    def __init__(self, model_path: str) -> None:
        self._voice = PiperVoice.load(model_path)

    def synthesize(self, text: str) -> bytes:
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            self._voice.synthesize_wav(text, wav_file)
        return buffer.getvalue()
