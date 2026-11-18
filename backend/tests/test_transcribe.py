from fastapi.testclient import TestClient

from app.main import app


def test_transcribe_returns_mock_text() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/v1/conversation/transcribe",
        files={"file": ("recording.webm", b"fake-audio-bytes", "audio/webm")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "transcribed question"
    assert data["language"] == "en"
    assert isinstance(data["stt_ms"], int)
    assert data["stt_ms"] >= 0
