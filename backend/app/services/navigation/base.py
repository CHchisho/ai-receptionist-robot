import re
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class Location:
    name: str
    floor: str
    landmark: str
    directions: str
    image_url: str | None = None


class NavigationProvider(Protocol):
    def find(self, query: str) -> Location | None: ...


def alias_in_text(alias: str, normalized_query: str) -> bool:
    """True when alias is a whole word or phrase in the query.

    ``reception`` must not match inside ``receptionist``.
    """
    if not alias or not normalized_query:
        return False
    pattern = r"(?<!\w)" + re.escape(alias).replace(r"\ ", r"\s+") + r"(?!\w)"
    return re.search(pattern, normalized_query) is not None
