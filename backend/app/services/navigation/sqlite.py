from app.services.knowledge import store
from app.services.navigation.base import Location


class SqliteNavigationProvider:
    """Indoor directions loaded from the editable location table."""

    def find(self, query: str) -> Location | None:
        normalized = _normalize(query)
        if not normalized:
            return None
        for record in store.list_locations():
            aliases = {_normalize(alias) for alias in record.aliases}
            aliases.add(_normalize(record.name))
            aliases.discard("")
            if any(alias in normalized for alias in aliases):
                return Location(
                    name=record.name,
                    floor=record.floor,
                    landmark=record.landmark,
                    directions=record.directions,
                )
        return None


def _normalize(value: str) -> str:
    return " ".join(value.lower().replace("?", " ").replace(".", " ").split())
