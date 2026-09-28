import wave
from unittest.mock import MagicMock, patch

from app.services.tts.piper import PiperTtsProvider


def _fake_synthesize_wav(text: str, wav_file: wave.Wave_write) -> None:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(22050)
    wav_file.writeframes(b"\x00\x00")


def test_synthesize_returns_wav_bytes() -> None:
    fake_voice = MagicMock()
    fake_voice.synthesize_wav.side_effect = _fake_synthesize_wav

    with patch("piper.PiperVoice.load", return_value=fake_voice) as load:
        provider = PiperTtsProvider(
            model_path_en="/models/en_voice.onnx",
            model_path_fi="/models/fi_voice.onnx",
        )

        assert load.call_count == 2
        load.assert_any_call("/models/en_voice.onnx")
        load.assert_any_call("/models/fi_voice.onnx")

        audio = provider.synthesize("Hello there", language="en")

    fake_voice.synthesize_wav.assert_called_once()
    assert audio.startswith(b"RIFF")