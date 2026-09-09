from unittest.mock import MagicMock, patch

from app.services.stt.whisper import WhisperSttProvider


def test_transcribe_joins_segment_text() -> None:
    fake_segments = [MagicMock(text=" Hello "), MagicMock(text="world ")]
    fake_model = MagicMock()
    fake_model.transcribe.return_value = (fake_segments, None)

    with patch("app.services.stt.whisper.WhisperModel", return_value=fake_model) as model_cls:
        provider = WhisperSttProvider(model_size="tiny", device="cpu", compute_type="int8")
        model_cls.assert_called_once_with("tiny", device="cpu", compute_type="int8")

        result = provider.transcribe(b"fake-audio-bytes")

    assert result == "Hello world"
