"""faster-whisper adapter for local speech-to-text."""

import logging
import os
import tempfile

from app.services.stt.base import SttResult

logger = logging.getLogger(__name__)


def _resolve_whisper_device(device: str) -> tuple[str, str]:
    """Return (device, compute_type) picking CUDA when device/compute_type are 'auto'."""
    if device != "auto":
        return device, "int8"  # compute_type resolved separately by caller
    try:
        import torch

        if torch.cuda.is_available():
            logger.info("Whisper: CUDA available (%s), using cuda + float16", torch.cuda.get_device_name(0))
            return "cuda", "float16"
    except ImportError:
        pass
    logger.info("Whisper: no CUDA, falling back to cpu + int8")
    return "cpu", "int8"


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

        resolved_device, auto_compute = _resolve_whisper_device(device)
        resolved_compute = auto_compute if compute_type == "auto" else compute_type

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
