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
                if title and _match_title(normalized, title):
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
                if title and _match_title(normalized, title):
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
    """Normalize query/title by lowercasing and removing punctuation."""
    # Remove common punctuation while preserving spaces
    import re
    normalized = value.lower()
    # Remove punctuation except spaces and hyphens (for compound words)
    normalized = re.sub(r"[^\w\s\-]", " ", normalized)
    # Collapse multiple spaces
    return " ".join(normalized.split())


def _match_title(query_normalized: str, title: str) -> bool:
    """
    Match query against title with partial word matching.
    Returns True if significant words from the title appear in the query.
    Example: "energy demo" matches "Energy Management System" (via "energy").
    
    Filters out common stop words to focus on meaningful keywords.
    """
    # Normalize query just in case (it should already be normalized by caller)
    query_normalized = _normalize(query_normalized)
    query_words = set(query_normalized.split())
    title_normalized = _normalize(title)
    title_words = set(title_normalized.split())
    
    # Common stop words to filter out
    STOP_WORDS = {"a", "an", "the", "and", "or", "is", "in", "of", "to", "for"}
    
    # Extract meaningful keywords from title
    title_keywords = title_words - STOP_WORDS
    
    # If all title words are stop words, fall back to exact title match
    if not title_keywords:
        return title_normalized in query_normalized
    
    # Match if at least one significant word from title is in query
    return bool(title_keywords & query_words)

