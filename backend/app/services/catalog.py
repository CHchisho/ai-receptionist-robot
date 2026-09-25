from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class CatalogHit:
    """A demo or event matched from the staff catalog, not from RAG."""

    kind: str
    title: str
    description: str
    source_id: str
    location: str | None = None
    event_time: str | None = None
    room: str | None = None
    url: str | None = None


class CatalogProvider(Protocol):
    def find(self, query: str) -> CatalogHit | None: ...


class NoOpCatalogProvider:
    def find(self, query: str) -> CatalogHit | None:
        return None


class StoreCatalogProvider:
    """Uses SQLite demo/event lists when tables exist."""

    def find(self, query: str) -> CatalogHit | None:
        from app.services.knowledge import store

        normalized = _normalize(query)
        if not normalized:
            return None

        list_demos = getattr(store, "list_demos", None)
        if callable(list_demos):
            for demo in list_demos():
                title = str(demo.get("title") or "")
                if title and title.lower() in normalized:
                    return CatalogHit(
                        kind="demo",
                        title=title,
                        description=str(demo.get("description") or ""),
                        location=demo.get("location"),
                        url=demo.get("url"),
                        source_id=f"demo-{demo.get('id')}",
                    )

        list_events = getattr(store, "list_events", None)
        if callable(list_events):
            for event in list_events():
                title = str(event.get("title") or "")
                if title and title.lower() in normalized:
                    return CatalogHit(
                        kind="event",
                        title=title,
                        description=str(event.get("description") or ""),
                        event_time=event.get("event_time"),
                        room=event.get("room"),
                        source_id=f"event-{event.get('id')}",
                    )

        return None


def _normalize(value: str) -> str:
    return " ".join(value.lower().replace("?", " ").replace(".", " ").split())
