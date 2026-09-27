from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class Location:
    name: str
    floor: str
    landmark: str
    directions: str


class NavigationProvider(Protocol):
    def find(self, query: str) -> Location | None: ...
