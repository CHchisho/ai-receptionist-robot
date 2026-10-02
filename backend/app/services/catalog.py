from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Protocol

_STOP_WORDS = frozenset({"a", "an", "the", "and", "or", "is", "in", "of", "to", "for"})
_GENERIC_WORDS = frozenset({"demo", "system", "workshop", "event", "meeting"})


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
    image_url: str | None = None


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

        best_score = 0
        best: tuple[str, dict] | None = None
        for kind, row in _catalog_rows(store):
            title = str(row.get("title") or "")
            score = _match_score(normalized, title)
            if score > best_score:
                best_score = score
                best = (kind, row)

        if best is None:
            return None
        return _hit_from_row(best[0], best[1])


def _catalog_rows(store: object) -> list[tuple[str, dict]]:
    rows: list[tuple[str, dict]] = []
    list_demos = getattr(store, "list_demos", None)
    if callable(list_demos):
        rows.extend(("demo", row) for row in list_demos() if not row.get("hidden"))
    list_events = getattr(store, "list_events", None)
    if callable(list_events):
        rows.extend(("event", row) for row in list_events() if not row.get("hidden"))
    return rows


def _hit_from_row(kind: str, row: dict) -> CatalogHit:
    title = str(row.get("title") or "")
    description = str(row.get("description") or "")
    if kind == "demo":
        return CatalogHit(
            kind="demo",
            title=title,
            description=description,
            location=row.get("location"),
            url=row.get("url"),
            image_url=row.get("image_url"),
            source_id=f"demo-{row.get('id')}",
        )
    return CatalogHit(
        kind="event",
        title=title,
        description=description,
        event_time=row.get("event_time"),
        room=row.get("room"),
        image_url=row.get("image_url"),
        source_id=f"event-{row.get('id')}",
    )


def _normalize(value: str) -> str:
    """Normalize query/title by lowercasing and removing punctuation."""
    normalized = value.lower()
    normalized = re.sub(r"[^\w\s\-]", " ", normalized)
    return " ".join(normalized.split())


def _content_words(normalized: str) -> set[str]:
    return {word for word in normalized.split() if word not in _STOP_WORDS}


def _match_score(query_normalized: str, title: str) -> int:
    """How many title words the query shares. Zero means no catalog hit.

    A shared word counts when it is specific (not a short token like "ai",
    and not a generic word like "workshop" or "demo"). The whole title in the
    question still matches. Callers keep the highest score.
    """
    query_words = _content_words(_normalize(query_normalized))
    title_normalized = _normalize(title)
    title_words = _content_words(title_normalized)
    if not title_words:
        return 1 if title_normalized and title_normalized in _normalize(query_normalized) else 0

    overlap = title_words & query_words
    if not overlap:
        return 0
    specific = {word for word in overlap if len(word) >= 3 and word not in _GENERIC_WORDS}
    if not specific and not title_words <= query_words:
        return 0
    return len(overlap)


def _match_title(query_normalized: str, title: str) -> bool:
    """True when this title alone would be a catalog hit."""
    return _match_score(query_normalized, title) > 0

