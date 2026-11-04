"""faster-whisper adapter for local speech-to-text."""

import logging
import os
import tempfile

from app.services.stt.base import SttResult

logger = logging.getLogger(__name__)


def _resolve_whisper_device(device: str, compute_type: str) -> tuple[str, str]:
    """Use CUDA when it is available. ``auto`` falls back to CPU."""
    if device == "auto":
        try:
            import torch

            if torch.cuda.is_available():
                device = "cuda"
                logger.info("Whisper: CUDA available (%s)", torch.cuda.get_device_name(0))
            else:
                device = "cpu"
                logger.info("Whisper: CUDA not available, using CPU")
        except ImportError:
            device = "cpu"
            logger.info("Whisper: torch is missing, using CPU")

    if compute_type == "auto":
        compute_type = "float16" if device == "cuda" else "int8"
    return device, compute_type


class WhisperSttProvider:
    """Transcribes audio locally using faster-whisper.

    The model is loaded once and reused for every request.
    device='auto' selects CUDA when available, otherwise CPU.
    compute_type='auto' uses float16 on CUDA and int8 on CPU.
    """

    def __init__(
        self,
        model_size: str = "small",
        device: str = "auto",
        compute_type: str = "auto",
    ) -> None:
        from faster_whisper import WhisperModel  # imported lazily so mock mode needs no model deps

        resolved_device, resolved_compute = _resolve_whisper_device(device, compute_type)

        logger.info("Loading Whisper '%s' on %s / %s", model_size, resolved_device, resolved_compute)
        self._model = WhisperModel(
            model_size,
            device=resolved_device,
            compute_type=resolved_compute,
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
