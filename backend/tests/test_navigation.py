from app.services.navigation.mock import MockNavigationProvider


def test_mock_navigation_finds_meeting_room() -> None:
    result = MockNavigationProvider().find("Where is the meeting room?")

    assert result is not None
    assert result.name == "Meeting room"
    assert result.floor == "1st floor"
    assert result.landmark == "opposite the restrooms"
    assert "meeting room" in result.directions.lower()


def test_mock_navigation_returns_none_for_unknown_location() -> None:
    assert MockNavigationProvider().find("Where is the sauna?") is None
