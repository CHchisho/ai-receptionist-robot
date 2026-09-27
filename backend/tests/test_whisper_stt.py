from unittest.mock import MagicMock, patch

from app.services.stt.whisper import WhisperSttProvider


def test_transcribe_joins_segment_text() -> None:
    fake_segments = [
        MagicMock(text=" Hello ", avg_logprob=-0.5),
        MagicMock(text="world ", avg_logprob=-0.4),
    ]
    fake_model = MagicMock()
    fake_info = MagicMock(language="en")
    fake_model.transcribe.return_value = (fake_segments, fake_info)

    with patch("faster_whisper.WhisperModel", return_value=fake_model) as model_cls:
        provider = WhisperSttProvider(model_size="tiny", device="cpu", compute_type="int8")
        model_cls.assert_called_once_with("tiny", device="cpu", compute_type="int8")

        result = provider.transcribe(b"fake-audio-bytes")

    assert result.text == "Hello world"
    assert result.language == "en"
