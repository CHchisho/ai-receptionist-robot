from unittest.mock import MagicMock, patch

from app.services.stt.whisper import WhisperSttProvider, choose_transcription_language


def test_choose_language_keeps_confident_finnish() -> None:
    assert (
        choose_transcription_language("fi", 0.92, [("fi", 0.92), ("en", 0.04)])
        == "fi"
    )


def test_choose_language_rejects_weak_finnish() -> None:
    assert (
        choose_transcription_language("fi", 0.52, [("fi", 0.52), ("en", 0.31)])
        == "en"
    )


def test_choose_language_rejects_finnish_close_to_english() -> None:
    assert (
        choose_transcription_language("fi", 0.62, [("fi", 0.62), ("en", 0.55)])
        == "en"
    )


def test_choose_language_ignores_unrelated_top_language() -> None:
    assert (
        choose_transcription_language(
            "sv",
            0.7,
            [("sv", 0.7), ("en", 0.2), ("fi", 0.05)],
        )
        == "en"
    )


def test_transcribe_joins_segment_text_in_english() -> None:
    fake_segments = [
        MagicMock(text=" Hello ", avg_logprob=-0.5),
        MagicMock(text="world ", avg_logprob=-0.4),
    ]
    fake_model = MagicMock()
    fake_model.detect_language.return_value = ("en", 0.9, [("en", 0.9), ("fi", 0.05)])
    fake_model.transcribe.return_value = (fake_segments, MagicMock(language="en"))

    with patch("faster_whisper.WhisperModel", return_value=fake_model) as model_cls:
        provider = WhisperSttProvider(model_size="medium", device="cpu", compute_type="int8")
        model_cls.assert_called_once_with("medium", device="cpu", compute_type="int8")

        with patch("app.services.stt.whisper._decode_audio", return_value=object()):
            result = provider.transcribe(b"fake-audio-bytes")

    fake_model.transcribe.assert_called_once()
    assert fake_model.transcribe.call_args.kwargs["language"] == "en"
    assert fake_model.transcribe.call_args.kwargs["task"] == "transcribe"
    assert result.text == "Hello world"
    assert result.language == "en"


def test_transcribe_uses_finnish_when_detection_is_confident() -> None:
    fake_model = MagicMock()
    fake_model.detect_language.return_value = ("fi", 0.93, [("fi", 0.93), ("en", 0.02)])
    fake_model.transcribe.return_value = (
        [MagicMock(text="Hei")],
        MagicMock(language="fi"),
    )

    with patch("faster_whisper.WhisperModel", return_value=fake_model):
        provider = WhisperSttProvider(device="cpu", compute_type="int8")
        with patch("app.services.stt.whisper._decode_audio", return_value=object()):
            result = provider.transcribe(b"fake-audio-bytes")

    assert fake_model.transcribe.call_args.kwargs["language"] == "fi"
    assert result.text == "Hei"
    assert result.language == "fi"


def test_transcribe_forces_english_when_finnish_is_not_clear() -> None:
    fake_model = MagicMock()
    fake_model.detect_language.return_value = ("fi", 0.48, [("fi", 0.48), ("en", 0.4)])
    fake_model.transcribe.return_value = (
        [MagicMock(text="Where is the garage?")],
        MagicMock(language="en"),
    )

    with patch("faster_whisper.WhisperModel", return_value=fake_model):
        provider = WhisperSttProvider(device="cpu", compute_type="int8")
        with patch("app.services.stt.whisper._decode_audio", return_value=object()):
            result = provider.transcribe(b"fake-audio-bytes")

    assert fake_model.transcribe.call_args.kwargs["language"] == "en"
    assert result.text == "Where is the garage?"
    assert result.language == "en"


def test_transcribe_falls_back_to_english_when_detection_fails() -> None:
    fake_model = MagicMock()
    fake_model.detect_language.side_effect = RuntimeError("no speech")
    fake_model.transcribe.return_value = (
        [MagicMock(text="Hello")],
        MagicMock(language="en"),
    )

    with patch("faster_whisper.WhisperModel", return_value=fake_model):
        provider = WhisperSttProvider(device="cpu", compute_type="int8")
        with patch("app.services.stt.whisper._decode_audio", return_value=object()):
            result = provider.transcribe(b"fake-audio-bytes")

    assert fake_model.transcribe.call_args.kwargs["language"] == "en"
    assert result.language == "en"
