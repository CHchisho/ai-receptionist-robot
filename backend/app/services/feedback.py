from typing import Any

from app.services.knowledge import store


def save_feedback(
    rating: int,
    comment: str,
    session_id: str | None = None,
) -> dict[str, Any]:
    return store.save_feedback(rating, comment, session_id)


def list_feedback() -> list[dict[str, Any]]:
    return store.list_feedback()
