from app.services.navigation.base import Location


_LOCATIONS = [
    (
        Location(
            name="Main entrance",
            floor="1st floor, A-wing",
            landmark="entrance on the left side of the Innovation Garage map",
            directions="You are at the main entrance when you enter the Innovation Garage from the A-wing corridor.",
        ),
        {"main entrance", "entrance", "front door", "reception"},
    ),
    (
        Location(
            name="Lounge",
            floor="1st floor, A-wing",
            landmark="immediately after the main entrance",
            directions="From the main entrance, go straight into the first open area. The lounge is directly ahead before the Innovation wall.",
        ),
        {"lounge", "seating", "sofa", "waiting area"},
    ),
    (
        Location(
            name="Innovation wall",
            floor="1st floor, A-wing",
            landmark="between the lounge and the stage area",
            directions="From the main entrance, pass the lounge and continue into the open Innovation Garage area. The Innovation wall is on the route toward the stage.",
        ),
        {"innovation wall", "wall", "display wall", "innovation display"},
    ),
    (
        Location(
            name="Stage",
            floor="1st floor, A-wing",
            landmark="large open presentation area near the meeting room",
            directions="From the main entrance, walk through the lounge, continue past the Innovation wall, and enter the large open area. The stage is on the right side of that area.",
        ),
        {"stage", "presentation area", "presentations", "event area"},
    ),
    (
        Location(
            name="Ad-hoc meeting room",
            floor="1st floor, A-wing",
            landmark="left side below the main entrance area",
            directions="From the main entrance, turn left toward the side corridor. The ad-hoc meeting room is on the left side below the entrance area, before the restrooms.",
        ),
        {"ad-hoc meeting", "ad hoc meeting", "ad-hoc meeting room", "ad hoc meeting room", "small meeting room"},
    ),
    (
        Location(
            name="Meeting room",
            floor="1st floor, A-wing",
            landmark="top-right corner near the stage",
            directions="From the main entrance, go through the lounge and past the Innovation wall to the stage area. Continue to the top-right corner of the Garage; the meeting room is beside the stage.",
        ),
        {"meeting", "meeting room", "conference", "conference room"},
    ),
    (
        Location(
            name="Kitchen",
            floor="1st floor, A-wing",
            landmark="right side of the Innovation Garage map",
            directions="From the main entrance, walk through the lounge and past the Innovation wall into the open area, then continue to the right-hand side. The kitchen is on the far right side of the Garage.",
        ),
        {"kitchen", "coffee", "tea", "water", "break area"},
    ),
    (
        Location(
            name="Restrooms",
            floor="1st floor, A-wing",
            landmark="lower-left side near the ad-hoc meeting room",
            directions="From the main entrance, turn toward the left-side corridor below the lounge. The restrooms are on the lower-left side near the ad-hoc meeting room.",
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
