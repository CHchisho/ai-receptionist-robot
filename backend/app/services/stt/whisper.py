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

            results = {}

            for language in ("en", "fi"):
                segments, info = self._model.transcribe(
                    path,
                    language=language,
                    task="transcribe",
                )

                segment_list = list(segments)
                text = " ".join(
                    segment.text.strip() for segment in segment_list
                ).strip()

                avg_logprob = (
                    sum(segment.avg_logprob for segment in segment_list)
                    / len(segment_list)
                    if segment_list
                    else float("-inf")
                )

                results[language] = {
                    "text": text,
                    "avg_logprob": avg_logprob,
                }

                print(
                    f"Whisper {language}: "
                    f"logprob={avg_logprob}, text={text!r}"
                )

            detected_language = max(
                results,
                key=lambda language: results[language]["avg_logprob"],
            )

            print(f"Whisper selected language: {detected_language}")

            return SttResult(
                text=results[detected_language]["text"],
                language=detected_language,
            )
        finally:
            os.remove(path)