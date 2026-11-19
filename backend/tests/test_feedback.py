from app.core.config import settings
from app.services import feedback
from app.services.knowledge import store


def test_save_and_list_feedback():
    saved = feedback.save_feedback(
        rating=5,
        comment="Great service",
        session_id="test-session-123",
    )

    assert saved["rating"] == 5
    assert saved["comment"] == "Great service"
    assert saved["session_id"] == "test-session-123"

    items = feedback.list_feedback()

    assert len(items) == 1
    assert items[0]["rating"] == 5
    assert items[0]["comment"] == "Great service"
    assert items[0]["session_id"] == "test-session-123"


def test_delete_feedback():
    first = feedback.save_feedback(rating=4, comment="One", session_id=None)
    second = feedback.save_feedback(rating=2, comment="Two", session_id=None)

    feedback.delete_feedback(first["id"])
    remaining = feedback.list_feedback()
    assert [item["id"] for item in remaining] == [second["id"]]

    feedback.delete_feedback_ids([second["id"]])
    assert feedback.list_feedback() == []


def test_feedback_rejects_invalid_rating() -> None:
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    response = client.post(
        "/api/v1/feedback",
        json={"rating": 6, "comment": "Invalid rating"},
    )
    assert response.status_code == 422