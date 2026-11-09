"""faster-whisper adapter for local speech-to-text."""

import logging
import os
import tempfile

from app.services.stt.base import SttResult

logger = logging.getLogger(__name__)

# English is the reception default. Finnish is used only when it is clearly
# more likely than English. A weak "fi" guess makes Whisper decode the clip
# in Finnish, which comes out as a Finnish translation of English speech.
FINNISH_MIN_PROBABILITY = 0.6
FINNISH_MARGIN = 0.15


def choose_transcription_language(
    detected: str,
    probability: float,
    all_probs: list[tuple[str, float]] | None,
) -> str:
    """Pick English or Finnish for the decoder.

    The language token is fixed before transcription. Leaving it unset lets
    Whisper follow a shaky detector and write the utterance in the wrong language.
    """
    scores = {
        str(code).lower().split("-", 1)[0].split("_", 1)[0]: float(score)
        for code, score in (all_probs or [])
    }
    detected_code = str(detected or "en").lower().split("-", 1)[0].split("_", 1)[0]
    if detected_code not in scores:
        scores[detected_code] = float(probability or 0.0)

    english = scores.get("en", 0.0)
    finnish = scores.get("fi", 0.0)
    if finnish >= FINNISH_MIN_PROBABILITY and finnish >= english + FINNISH_MARGIN:
        return "fi"
    return "en"


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
        # int8_float16 keeps medium on a 12 GB GPU that also runs Ollama and Chatterbox.
        # float16 medium leaves no room for the encoder and CUDA then fails the request.
        compute_type = "int8_float16" if device == "cuda" else "int8"
    return device, compute_type


def _decode_audio(path: str):
    from faster_whisper.audio import decode_audio

    return decode_audio(path)


class WhisperSttProvider:
    """Transcribes audio locally using faster-whisper.

    The model is loaded once and reused for every request.
    device='auto' selects CUDA when available, otherwise CPU.
    compute_type='auto' uses int8_float16 on CUDA and int8 on CPU.
    """

    def __init__(
        self,
        model_size: str = "medium",
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

            language = self._language_for(path)
            segments, _info = self._model.transcribe(
                path,
                language=language,
                task="transcribe",
                vad_filter=True,
                condition_on_previous_text=False,
            )
            text = " ".join(segment.text.strip() for segment in segments).strip()
            logger.info("whisper transcription language=%s chars=%s", language, len(text))
            return SttResult(text=text, language=language or "en")
        finally:
            os.remove(path)

    def _language_for(self, path: str) -> str:
        try:
            waveform = _decode_audio(path)
            detected, probability, all_probs = self._model.detect_language(
                waveform,
                vad_filter=True,
            )
        except Exception:
            logger.exception("Whisper language detection failed; transcribing as English")
            return "en"

        language = choose_transcription_language(detected, probability, all_probs)
        logger.info(
            "whisper detect detected=%s probability=%.3f chosen=%s",
            detected,
            float(probability or 0.0),
            language,
        )
        return language
