"""faster-whisper adapter for local speech-to-text."""

import os
import tempfile


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

        self._model = WhisperModel(model_size, device=device, compute_type=compute_type)

    def transcribe(self, audio: bytes) -> str:
        # Write to a closed file first: faster-whisper reopens the path itself,
        # and a still-open NamedTemporaryFile can't be reopened on Windows.
        fd, path = tempfile.mkstemp(suffix=".webm")
        try:
            with os.fdopen(fd, "wb") as tmp:
                tmp.write(audio)
            segments, _ = self._model.transcribe(path)
            return " ".join(segment.text.strip() for segment in segments).strip()
        finally:
            os.remove(path)
