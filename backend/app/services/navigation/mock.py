from app.services.navigation.base import Location


_LOCATIONS = [
    (
        Location(
            name="Meeting room",
            floor="1st floor",
            landmark="opposite the restrooms",
            directions="Walk past the demo area toward the glass wall. The meeting room is on your right, opposite the restrooms.",
        ),
        {"meeting", "meeting room", "room", "conference", "conference room"},
    ),
    (
        Location(
            name="Demo area",
            floor="1st floor",
            landmark="next to the main reception tablet",
            directions="Stay on this floor and follow the open display space. The demo area is next to the main reception tablet.",
        ),
        {"demo", "demo area", "demos", "display", "showcase"},
    ),
    (
        Location(
            name="Restrooms",
            floor="1st floor",
            landmark="beside the meeting room",
            directions="Walk past the demo area toward the glass wall. The restrooms are beside the meeting room.",
        ),
        {"restroom", "restrooms", "toilet", "toilets", "bathroom"},
    ),
]


class MockNavigationProvider:
    """Structured indoor directions live here, not in the LLM."""

    def find(self, query: str) -> Location | None:
        normalized = _normalize(query)
        if not normalized:
            return None
        for location, aliases in _LOCATIONS:
            if any(alias in normalized for alias in aliases):
                return location
        return None


def _normalize(value: str) -> str:
    return " ".join(value.lower().replace("?", " ").replace(".", " ").split())
