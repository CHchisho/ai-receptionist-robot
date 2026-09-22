from __future__ import annotations

import hashlib
import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def db_path() -> Path:
    path = settings.sqlite_file
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(db_path())
    connection.row_factory = sqlite3.Row
    _init(connection)
    return connection


def _init(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS sources (
            source_id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            title TEXT NOT NULL,
            url TEXT,
            filename TEXT,
            file_hash TEXT,
            content_hash TEXT,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS turns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            retrieved_json TEXT NOT NULL,
            system_prompt TEXT NOT NULL,
            user_prompt TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rating INTEGER NOT NULL,
            comment TEXT NOT NULL DEFAULT '',
            session_id TEXT,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS kiosk_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            mode TEXT NOT NULL DEFAULT 'chat'
        );
        INSERT OR IGNORE INTO kiosk_settings (id, mode)
        VALUES (1, 'chat');
        CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id, id);
        CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback(session_id, id);
        """
    )
    connection.commit()


@dataclass(frozen=True)
class SourceRecord:
    source_id: str
    kind: str
    title: str
    url: str | None
    filename: str | None
    file_hash: str | None
    content_hash: str | None
    created_at: str


def upsert_source(
    source_id: str,
    kind: str,
    title: str,
    url: str | None = None,
    filename: str | None = None,
    file_hash: str | None = None,
    content_hash: str | None = None,
) -> None:
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO sources (source_id, kind, title, url, filename, file_hash, content_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_id) DO UPDATE SET
                kind = excluded.kind,
                title = excluded.title,
                url = excluded.url,
                filename = excluded.filename,
                file_hash = excluded.file_hash,
                content_hash = excluded.content_hash
            """,
            (source_id, kind, title, url, filename, file_hash, content_hash, _utc_now()),
        )
        connection.commit()


def delete_source(source_id: str) -> None:
    with connect() as connection:
        connection.execute("DELETE FROM sources WHERE source_id = ?", (source_id,))
        connection.commit()


def list_sources() -> list[SourceRecord]:
    with connect() as connection:
        rows = connection.execute(
            "SELECT source_id, kind, title, url, filename, file_hash, content_hash, created_at FROM sources ORDER BY created_at"
        ).fetchall()
    return [_source_from_row(row) for row in rows]


def get_source(source_id: str) -> SourceRecord | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT source_id, kind, title, url, filename, file_hash, content_hash, created_at FROM sources WHERE source_id = ?",
            (source_id,),
        ).fetchone()
    return _source_from_row(row) if row else None


def save_turn(
    session_id: str,
    question: str,
    answer: str,
    retrieved: list[dict],
    system_prompt: str,
    user_prompt: str,
) -> None:
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO turns (session_id, question, answer, retrieved_json, system_prompt, user_prompt, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                question,
                answer,
                json.dumps(retrieved, ensure_ascii=False),
                system_prompt,
                user_prompt,
                _utc_now(),
            ),
        )
        connection.commit()


def list_sessions(limit: int = 50) -> list[dict]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT session_id,
                   MIN(created_at) AS started_at,
                   MAX(created_at) AS updated_at,
                   COUNT(*) AS turn_count,
                   (
                     SELECT question FROM turns t2
                     WHERE t2.session_id = turns.session_id
                     ORDER BY t2.id DESC LIMIT 1
                   ) AS last_question
            FROM turns
            GROUP BY session_id
            ORDER BY MAX(created_at) DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def list_turns(session_id: str) -> list[dict]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT id, session_id, question, answer, retrieved_json, system_prompt, user_prompt, created_at
            FROM turns
            WHERE session_id = ?
            ORDER BY id
            """,
            (session_id,),
        ).fetchall()
    turns = []
    for row in rows:
        item = dict(row)
        item["retrieved"] = json.loads(item.pop("retrieved_json") or "[]")
        turns.append(item)
    return turns


def save_feedback(
    rating: int,
    comment: str,
    session_id: str | None = None,
) -> dict:
    created_at = _utc_now()
    with connect() as connection:
        cursor = connection.execute(
            """
            INSERT INTO feedback (rating, comment, session_id, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (rating, comment, session_id, created_at),
        )
        feedback_id = cursor.lastrowid
        connection.commit()
    return {
        "id": feedback_id,
        "rating": rating,
        "comment": comment,
        "session_id": session_id,
        "created_at": created_at,
    }


def list_feedback() -> list[dict]:
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT id, rating, comment, session_id, created_at
            FROM feedback
            ORDER BY id DESC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def get_kiosk_mode() -> str:
    with connect() as connection:
        row = connection.execute(
            "SELECT mode FROM kiosk_settings WHERE id = 1"
        ).fetchone()
    return row["mode"] if row else "chat"


def set_kiosk_mode(mode: str) -> str:
    with connect() as connection:
        connection.execute(
            "UPDATE kiosk_settings SET mode = ? WHERE id = 1",
            (mode,),
        )
        connection.commit()
    return mode


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _source_from_row(row: sqlite3.Row) -> SourceRecord:
    return SourceRecord(
        source_id=row["source_id"],
        kind=row["kind"],
        title=row["title"],
        url=row["url"],
        filename=row["filename"],
        file_hash=row["file_hash"],
        content_hash=row["content_hash"],
        created_at=row["created_at"],
    )
