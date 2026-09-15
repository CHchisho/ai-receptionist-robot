from app.services import feedback


def test_save_and_list_feedback(tmp_path, monkeypatch):
    test_db = tmp_path / "feedback.db"
    monkeypatch.setattr(feedback, "DB_FILE", test_db)

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