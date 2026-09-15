from fastapi.testclient import TestClient

from app.main import app


def test_transcribe_returns_mock_text() -> None:
    client = TestClient(app)
    response = client.post(
        "/api/v1/conversation/transcribe",
        files={"file": ("recording.webm", b"fake-audio-bytes", "audio/webm")},
    )

    assert response.status_code == 200
    assert response.json() == {"text": "transcribed question"}
