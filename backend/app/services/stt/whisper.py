"""faster-whisper adapter for local speech-to-text."""

import os
import tempfile

from app.services.stt.base import SttResult


class WhisperSttProvider:
    """Transcribes audio locally using faster-whisper.

    The model is loaded once and reused for every request.
    """

    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
    ) -> None:
        from faster_whisper import WhisperModel  # imported lazily so mock mode needs no model deps

        self._model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )

    def transcribe(self, audio: bytes) -> SttResult:
        fd, path = tempfile.mkstemp(suffix=".webm")
        try:
            with os.fdopen(fd, "wb") as tmp:
                tmp.write(audio)

            segments, info = self._model.transcribe(path)
            text = " ".join(segment.text.strip() for segment in segments).strip()
            detected = getattr(info, "language", None) or "en"
            language = str(detected).lower().split("-", 1)[0].split("_", 1)[0]

            return SttResult(text=text, language=language or "en")
        finally:
            os.remove(path)