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
