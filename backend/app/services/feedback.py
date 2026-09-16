import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_FILE = Path(__file__).resolve().parent.parent / "data" / "feedback.db"

def _get_connection() -> sqlite3.Connection:
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DB_FILE)
    connection.row_factory = sqlite3.Row

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rating INTEGER NOT NULL,
            comment TEXT NOT NULL DEFAULT '',
            session_id TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    connection.commit()

    return connection

def save_feedback(
    rating: int,
    comment: str,
    session_id: str | None = None,
) -> dict[str, Any]:
    created_at = datetime.now(timezone.utc).isoformat()

    with _get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO feedback (rating, comment, session_id, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (rating, comment, session_id, created_at),
        )

        feedback_id = cursor.lastrowid

    return {
        "id": feedback_id,
        "rating": rating,
        "comment": comment,
        "session_id": session_id,
        "created_at": created_at,
    }

def list_feedback() -> list[dict[str, Any]]:
    with _get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, rating, comment, session_id, created_at
            FROM feedback
            ORDER BY id DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]