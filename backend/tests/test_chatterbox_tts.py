import sys
import types
from unittest.mock import MagicMock, patch

import pytest

from app.services.tts.chatterbox import (
    ChatterboxTtsProvider,
    ensure_lessac_reference,
    load_chatterbox_model,
)


class _FakeTensor:
    def __init__(self, samples: list[float]) -> None:
        self._samples = samples

    def squeeze(self, _axis: int = 0) -> "_FakeTensor":
        return self

    def detach(self) -> "_FakeTensor":
        return self

    def cpu(self) -> "_FakeTensor":
        return self

    def numpy(self) -> list[float]:
        return self._samples


def _fake_model() -> MagicMock:
    model = MagicMock()
    model.generate.return_value = _FakeTensor([0.0, 0.25, -0.25])
    model.sr = 24000
    model.conds = object()
    return model


def test_synthesize_returns_wav_for_finnish(tmp_path) -> None:
    fake_model = _fake_model()
    reference = tmp_path / "lena-lessac-reference.wav"
    reference.write_bytes(b"RIFF")

    with (
        patch("app.services.tts.chatterbox.load_chatterbox_model", return_value=fake_model),
        patch("app.services.tts.chatterbox.ensure_lessac_reference", return_value=reference),
    ):
        provider = ChatterboxTtsProvider(device="cpu", cfg_weight=0.0)
        audio = provider.synthesize("Hei, minä olen Lena.", language="fi")

    fake_model.prepare_conditionals.assert_called_once_with(str(reference), exaggeration=0.5)
    fake_model.generate.assert_called_once_with(
        "Hei, minä olen Lena.",
        language_id="fi",
        exaggeration=0.5,
        cfg_weight=0.0,
    )
    assert audio.startswith(b"RIFF")


def test_unsupported_language_falls_back_to_english(tmp_path) -> None:
    fake_model = _fake_model()
    reference = tmp_path / "lena-lessac-reference.wav"
    reference.write_bytes(b"RIFF")

    with (
        patch("app.services.tts.chatterbox.load_chatterbox_model", return_value=fake_model),
        patch("app.services.tts.chatterbox.ensure_lessac_reference", return_value=reference),
    ):
        provider = ChatterboxTtsProvider(device="cpu")
        provider.synthesize("Hello", language="xx")

    assert fake_model.generate.call_args.kwargs["language_id"] == "en"


def test_ensure_lessac_reference_writes_female_clip_once(tmp_path) -> None:
    model = tmp_path / "en_US-lessac-medium.onnx"
    model.write_bytes(b"model")
    written: dict[str, str] = {}

    def fake_synthesize(text: str, wav_file) -> None:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(22050)
        wav_file.writeframes(b"\x00\x00" * 10)
        written["text"] = text

    voice = MagicMock()
    voice.synthesize_wav.side_effect = fake_synthesize
    with (
        patch("app.services.tts.piper.ensure_piper_voice", return_value=model),
        patch("piper.PiperVoice.load", return_value=voice),
    ):
        path = ensure_lessac_reference(str(model))
        again = ensure_lessac_reference(str(model))

    assert path == model.with_name("lena-lessac-reference.wav")
    assert path.is_file()
    assert again == path
    assert "Lena" in written["text"]
    voice.synthesize_wav.assert_called_once()


def test_reference_wav_is_cloned_once(tmp_path) -> None:
    reference = tmp_path / "lena.wav"
    reference.write_bytes(b"not-a-real-wav")
    fake_model = _fake_model()

    with patch("app.services.tts.chatterbox.load_chatterbox_model", return_value=fake_model):
        provider = ChatterboxTtsProvider(device="cpu", reference_wav=str(reference), exaggeration=0.4)
        provider.synthesize("Hello", language="en")

    fake_model.prepare_conditionals.assert_called_once_with(str(reference), exaggeration=0.4)
    assert "audio_prompt_path" not in fake_model.generate.call_args.kwargs


def test_load_uses_v3_only_when_the_installed_api_accepts_it() -> None:
    module = types.ModuleType("chatterbox.mtl_tts")
    package = types.ModuleType("chatterbox")

    class WithoutV3:
        @classmethod
        def from_pretrained(cls, device: str):
            return ("multilingual", device)

    class WithV3:
        @classmethod
        def from_pretrained(cls, device: str, t3_model: str | None = None):
            return ("v3", device, t3_model)

    modules = {"chatterbox": package, "chatterbox.mtl_tts": module}
    module.ChatterboxMultilingualTTS = WithoutV3
    with patch.dict(sys.modules, modules):
        assert load_chatterbox_model("cpu") == ("multilingual", "cpu")

    module.ChatterboxMultilingualTTS = WithV3
    with patch.dict(sys.modules, modules):
        assert load_chatterbox_model("cuda") == ("v3", "cuda", "v3")


def test_missing_reference_wav_raises(tmp_path) -> None:
    with pytest.raises(FileNotFoundError):
        ChatterboxTtsProvider(device="cpu", reference_wav=str(tmp_path / "missing.wav"))
