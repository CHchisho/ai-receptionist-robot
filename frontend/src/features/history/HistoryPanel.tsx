import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteSession,
  getSession,
  listSessions,
  type HistorySession,
  type HistoryTurn,
} from "@/features/history/api";
import { IconEllipsisVertical } from "@/shared/icons";
import styles from "./HistoryPanel.module.css";

function dayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10) || value;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayLabel(key: string) {
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return key;
  }
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DayGroup = {
  key: string;
  label: string;
  sessions: HistorySession[];
  messages: number;
};

function groupByDay(sessions: HistorySession[]): DayGroup[] {
  const groups = new Map<string, HistorySession[]>();
  for (const session of sessions) {
    const key = dayKey(session.updated_at);
    const current = groups.get(key);
    if (current) {
      current.push(session);
    } else {
      groups.set(key, [session]);
    }
  }
  return [...groups.entries()]
    .sort(([left], [right]) => (left < right ? 1 : left > right ? -1 : 0))
    .map(([key, daySessions]) => ({
      key,
      label: dayLabel(key),
      sessions: daySessions,
      messages: daySessions.reduce((sum, session) => sum + session.turn_count, 0),
    }));
}

export function HistoryPanel() {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [turns, setTurns] = useState<HistoryTurn[]>([]);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const days = useMemo(() => groupByDay(sessions), [sessions]);

  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch(() => setError("Could not load chat history."));
  }, []);

  useEffect(() => {
    if (!menuId) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuId(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuId(null);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuId]);

  async function removeDay(day: DayGroup) {
    setMenuId(null);
    setError(null);
    try {
      await Promise.all(day.sessions.map((session) => deleteSession(session.session_id)));
      const ids = new Set(day.sessions.map((session) => session.session_id));
      setSessions((current) => current.filter((item) => !ids.has(item.session_id)));
      if (openId && ids.has(openId)) {
        setOpenId(null);
        setTurns([]);
        setDetailsId(null);
      }
      if (openDay === day.key) {
        setOpenDay(null);
      }
    } catch {
      setError("Could not delete chats for this day.");
    }
  }

  async function remove(sessionId: string) {
    setMenuId(null);
    setError(null);
    try {
      await deleteSession(sessionId);
      setSessions((current) => current.filter((item) => item.session_id !== sessionId));
      if (openId === sessionId) {
        setOpenId(null);
        setTurns([]);
        setDetailsId(null);
      }
    } catch {
      setError("Could not delete this chat.");
    }
  }

  async function toggle(sessionId: string) {
    if (openId === sessionId) {
      setOpenId(null);
      setTurns([]);
      setDetailsId(null);
      return;
    }
    setError(null);
    try {
      const detail = await getSession(sessionId);
      setOpenId(sessionId);
      setTurns(detail.turns);
      setDetailsId(null);
    } catch {
      setError("Could not load this chat.");
    }
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Chat history</h2>
      <p className={styles.copy}>Visitor chats. Open a row, then use i for the prompt sent to the model.</p>
      {error ? <p className={styles.error}>{error}</p> : null}
      {sessions.length === 0 ? (
        <p className={styles.copy}>No chats yet.</p>
      ) : (
        <ul className={styles.list}>
          {days.map((day) => {
            const open = openDay === day.key;
            const dayMenu = `day:${day.key}`;
            return (
              <li key={day.key} className={styles.item}>
                <div className={styles.dayRow} ref={menuId === dayMenu ? menuRef : undefined}>
                  <button
                    type="button"
                    className={styles.day}
                    aria-expanded={open}
                    onClick={() => setOpenDay(open ? null : day.key)}
                  >
                    <span>{day.label}</span>
                    <span className={styles.stats}>
                      <span>
                        <strong>{day.sessions.length}</strong>{" "}
                        {day.sessions.length === 1 ? "chat" : "chats"}
                      </span>
                      <span>
                        <strong>{day.messages}</strong>{" "}
                        {day.messages === 1 ? "message" : "messages"}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.menuButton}
                    aria-label="Day actions"
                    aria-haspopup="menu"
                    aria-expanded={menuId === dayMenu}
                    onClick={() => setMenuId((current) => (current === dayMenu ? null : dayMenu))}
                  >
                    <IconEllipsisVertical className={styles.menuIcon} />
                  </button>
                  {menuId === dayMenu ? (
                    <div className={styles.menu} role="menu">
                      <button
                        type="button"
                        className={styles.menuItem}
                        role="menuitem"
                        onClick={() => void removeDay(day)}
                      >
                        Delete chats for this day
                      </button>
                    </div>
                  ) : null}
                </div>
                {open ? (
                  <ul className={styles.sessions}>
                    {day.sessions.map((session) => (
                      <li key={session.session_id} className={styles.sessionItem}>
                        <div
                          className={styles.sessionRow}
                          ref={menuId === session.session_id ? menuRef : undefined}
                        >
                          <button
                            type="button"
                            className={styles.session}
                            onClick={() => void toggle(session.session_id)}
                          >
                            <span>{session.last_question || "Chat"}</span>
                            <span className={styles.meta}>
                              {session.turn_count} {session.turn_count === 1 ? "message" : "messages"} ·{" "}
                              {formatTime(session.updated_at)}
                            </span>
                          </button>
                          <button
                            type="button"
                            className={styles.menuButton}
                            aria-label="Chat actions"
                            aria-haspopup="menu"
                            aria-expanded={menuId === session.session_id}
                            onClick={() =>
                              setMenuId((current) =>
                                current === session.session_id ? null : session.session_id,
                              )
                            }
                          >
                            <IconEllipsisVertical className={styles.menuIcon} />
                          </button>
                          {menuId === session.session_id ? (
                            <div className={styles.menu} role="menu">
                              <button
                                type="button"
                                className={styles.menuItem}
                                role="menuitem"
                                onClick={() => void remove(session.session_id)}
                              >
                                Delete chat
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {openId === session.session_id
                          ? turns.map((turn) => (
                            <article key={turn.id} className={styles.turn}>
                              <p>
                                <strong>Visitor:</strong> {turn.question}
                              </p>
                              <div className={styles.lenaRow}>
                                <p>
                                  <strong>Lena:</strong> {turn.answer}
                                </p>
                                <button
                                  type="button"
                                  className={styles.info}
                                  aria-label="Show request details"
                                  aria-expanded={detailsId === turn.id}
                                  onClick={() => setDetailsId(detailsId === turn.id ? null : turn.id)}
                                >
                                  i
                                </button>
                              </div>
                              {detailsId === turn.id ? (
                                <div className={styles.details}>
                                  <details>
                                    <summary>Retrieved</summary>
                                    {turn.retrieved.length === 0 ? (
                                      <p className={styles.meta}>No knowledge chunks.</p>
                                    ) : (
                                      <ul className={styles.retrieved}>
                                        {turn.retrieved.map((chunk, index) => (
                                          <li key={`${chunk.source_id}-${index}`}>
                                            <strong>{chunk.title}</strong>
                                            <span>{chunk.snippet}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </details>
                                  <details>
                                    <summary>Context sent to the model</summary>
                                    <pre className={styles.prompt}>{turn.user_prompt}</pre>
                                  </details>
                                  <details>
                                    <summary>System prompt</summary>
                                    <pre className={styles.prompt}>{turn.system_prompt}</pre>
                                  </details>
                                </div>
                              ) : null}
                            </article>
                          ))
                          : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
