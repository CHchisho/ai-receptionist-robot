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