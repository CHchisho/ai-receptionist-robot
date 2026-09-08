from typing import Protocol


class NavigationProvider(Protocol):
    def find(self, query: str) -> str | None: ...
