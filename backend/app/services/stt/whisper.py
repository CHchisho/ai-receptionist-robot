"""faster-whisper adapter for local speech-to-text."""

import tempfile

from faster_whisper import WhisperModel


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
        self._model = WhisperModel(model_size, device=device, compute_type=compute_type)

    def transcribe(self, audio: bytes) -> str:
        # faster-whisper needs a file-like/on-disk source, not raw bytes.
        with tempfile.NamedTemporaryFile(suffix=".webm") as tmp:
            tmp.write(audio)
            tmp.flush()
            segments, _ = self._model.transcribe(tmp.name)
            return " ".join(segment.text.strip() for segment in segments).strip()
