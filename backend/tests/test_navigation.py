from app.services.navigation.mock import MockNavigationProvider


def test_mock_navigation_finds_map_location() -> None:
    result = MockNavigationProvider().find("Where is the kitchen?")

    assert result is not None
    assert result.name == "Kitchen"
    assert result.floor == "1st floor, A-wing"
    assert result.landmark == "right side of the Innovation Garage map"
    assert "far right" in result.directions.lower()


def test_mock_navigation_matches_cindy_map_locations() -> None:
    provider = MockNavigationProvider()

    assert provider.find("Where is the lounge?").name == "Lounge"
    assert provider.find("Show me the innovation wall").name == "Innovation wall"
    assert provider.find("Where is the stage?").name == "Stage"
    assert provider.find("Where is the ad hoc meeting room?").name == "Ad-hoc meeting room"
    assert provider.find("Where are the restrooms?").name == "Restrooms"
    assert provider.find("Where is the main entrance?").name == "Main entrance"
    assert provider.find("Where is the meeting room?").name == "Meeting room"


def test_mock_navigation_returns_none_for_unknown_location() -> None:
    assert MockNavigationProvider().find("Where is the sauna?") is None
