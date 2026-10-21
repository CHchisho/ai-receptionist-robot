"""Chatterbox Multilingual V3 adapter for local text-to-speech."""

from __future__ import annotations

import io
import logging
import wave
from pathlib import Path

logger = logging.getLogger(__name__)

# Long enough for Chatterbox to clone a speaker. Lessac is the female Piper voice.
LESSAC_REFERENCE_TEXT = (
    "Hello, I am Lena. Welcome to the Nokia Innovation Garage. "
    "I can help you find a room, a demo, or an event. "
    "Ask me a question, and I will answer in a clear friendly voice."
)

# Keep in sync with chatterbox.mtl_tts.SUPPORTED_LANGUAGES.
SUPPORTED_LANGUAGES = frozenset(
    {
        "ar",
        "da",
        "de",
        "el",
        "en",
        "es",
        "fi",
        "fr",
        "he",
        "hi",
        "it",
        "ja",
        "ko",
        "ms",
        "nl",
        "no",
        "pl",
        "pt",
        "ru",
        "sv",
        "sw",
        "tr",
        "zh",
    }
)


def resolve_chatterbox_device(device: str) -> str:
    """Pick CUDA when device is ``auto`` and a GPU is visible."""
    if device != "auto":
        return device
    import torch

    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def load_chatterbox_model(device: str):
    """Download and load Chatterbox Multilingual.

    PyPI 0.1.7 loads the multilingual checkpoint and does not accept ``t3_model``.
    Newer source builds do; those get the V3 weights.
    """
    import inspect

    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    kwargs: dict[str, str] = {"device": device}
    if "t3_model" in inspect.signature(ChatterboxMultilingualTTS.from_pretrained).parameters:
        kwargs["t3_model"] = "v3"
        logger.info("Chatterbox build accepts t3_model; loading Multilingual V3")
    else:
        logger.info("Chatterbox build has no t3_model argument; loading its multilingual checkpoint")
    return ChatterboxMultilingualTTS.from_pretrained(**kwargs)


def lessac_reference_path(piper_model_path: str) -> Path:
    return Path(piper_model_path).with_name("lena-lessac-reference.wav")


def ensure_lessac_reference(piper_model_path: str) -> Path:
    """Build a female reference clip from Piper Lessac when one is not already saved."""
    destination = lessac_reference_path(piper_model_path)
    if destination.is_file() and destination.stat().st_size > 44:
        return destination

    from piper import PiperVoice

    from app.services.tts.piper import ensure_piper_voice

    model_path = ensure_piper_voice(piper_model_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Creating female Chatterbox reference from Piper Lessac at %s", destination)
    voice = PiperVoice.load(str(model_path))
    with wave.open(str(destination), "wb") as wav_file:
        voice.synthesize_wav(LESSAC_REFERENCE_TEXT, wav_file)
    return destination


def _pcm_wav(samples, sample_rate: int) -> bytes:
    import array

    flat = samples.reshape(-1) if hasattr(samples, "reshape") else samples
    pcm = array.array("h")
    for sample in flat:
        value = float(sample)
        if value > 1.0:
            value = 1.0
        elif value < -1.0:
            value = -1.0
        pcm.append(int(value * 32767))

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm.tobytes())
    return buffer.getvalue()


class ChatterboxTtsProvider:
    """One Chatterbox voice for every language the model supports.

    An empty reference path clones the female Piper Lessac voice.
    A wav path clones that speaker instead and reuses it for English, Finnish, and the rest.
    """

    def __init__(
        self,
        device: str = "cpu",
        reference_wav: str = "",
        piper_model_path: str = "models/piper/en_US-lessac-medium.onnx",
        exaggeration: float = 0.5,
        cfg_weight: float = 0.0,
    ) -> None:
        reference = reference_wav.strip()
        if reference:
            if not Path(reference).is_file():
                raise FileNotFoundError(f"Chatterbox reference wav not found: {reference}")
        else:
            reference = str(ensure_lessac_reference(piper_model_path))

        resolved_device = resolve_chatterbox_device(device)
        logger.info("Loading Chatterbox Multilingual on %s", resolved_device)
        self._model = load_chatterbox_model(resolved_device)
        self._exaggeration = exaggeration
        self._cfg_weight = cfg_weight
        self._reference_wav = reference

        logger.info("Cloning Chatterbox voice from %s", reference)
        self._model.prepare_conditionals(reference, exaggeration=exaggeration)

    def synthesize(self, text: str, language: str) -> bytes:
        language_id = (language or "en").lower().split("-", 1)[0].split("_", 1)[0]
        if language_id not in SUPPORTED_LANGUAGES:
            language_id = "en"

        wav = self._model.generate(
            text,
            language_id=language_id,
            exaggeration=self._exaggeration,
            cfg_weight=self._cfg_weight,
        )
        samples = wav.squeeze(0).detach().cpu().numpy()
        return _pcm_wav(samples, int(self._model.sr))
