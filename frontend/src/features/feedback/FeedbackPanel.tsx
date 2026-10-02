import { useEffect, useMemo, useRef, useState } from "react";
import { IconEllipsisVertical } from "@/shared/icons";
import styles from "./FeedbackPanel.module.css";

type FeedbackItem = {
  id: number;
  rating: number;
  comment: string;
  session_id: string | null;
  created_at: string;
};

type DayGroup = {
  key: string;
  label: string;
  items: FeedbackItem[];
  average: number;
};

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

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAverage(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function groupByDay(items: FeedbackItem[]): DayGroup[] {
  const groups = new Map<string, FeedbackItem[]>();
  for (const item of items) {
    const key = dayKey(item.created_at);
    const current = groups.get(key);
    if (current) {
      current.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return [...groups.entries()]
    .sort(([left], [right]) => (left < right ? 1 : left > right ? -1 : 0))
    .map(([key, dayItems]) => {
      const total = dayItems.reduce((sum, item) => sum + item.rating, 0);
      return {
        key,
        label: dayLabel(key),
        items: dayItems,
        average: total / dayItems.length,
      };
    });
}

export function FeedbackPanel() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const days = useMemo(() => groupByDay(feedback), [feedback]);

  useEffect(() => {
    fetch("/api/v1/feedback")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load feedback");
        }
        return response.json();
      })
      .then((data: FeedbackItem[]) => {
        setFeedback(data);
        setError(null);
      })
      .catch(() => {
        setError("Could not load visitor feedback.");
      });
  }, []);

  useEffect(() => {
    if (!menuKey) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuKey(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuKey(null);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuKey]);

  async function removeOne(item: FeedbackItem) {
    setMenuKey(null);
    setError(null);
    try {
      const response = await fetch(`/api/v1/feedback/${item.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete feedback");
      }
      setFeedback((current) => current.filter((entry) => entry.id !== item.id));
    } catch {
      setError("Could not delete this review.");
    }
  }

  async function removeDay(day: DayGroup) {
    setMenuKey(null);
    setError(null);
    try {
      const response = await fetch("/api/v1/feedback", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: day.items.map((item) => item.id) }),
      });
      if (!response.ok) {
        throw new Error("Failed to delete feedback");
      }
      const ids = new Set(day.items.map((item) => item.id));
      setFeedback((current) => current.filter((entry) => !ids.has(entry.id)));
      if (openDay === day.key) {
        setOpenDay(null);
      }
    } catch {
      setError("Could not delete reviews for this day.");
    }
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Visitor feedback</h2>
      <p className={styles.copy}>Ratings and comments from the reception tablet.</p>
      {error ? <p className={styles.error}>{error}</p> : null}
      {!error && feedback.length === 0 ? <p className={styles.copy}>No feedback yet.</p> : null}
      {days.length > 0 ? (
        <ul className={styles.list}>
          {days.map((day) => {
            const open = openDay === day.key;
            const dayMenu = `day:${day.key}`;
            return (
              <li key={day.key} className={styles.item}>
                <div className={styles.dayRow} ref={menuKey === dayMenu ? menuRef : undefined}>
                  <button
                    type="button"
                    className={styles.day}
                    aria-expanded={open}
                    onClick={() => setOpenDay(open ? null : day.key)}
                  >
                    <span>{day.label}</span>
                    <span className={styles.stats}>
                      <span>
                        <strong>{day.items.length}</strong>{" "}
                        {day.items.length === 1 ? "review" : "reviews"}
                      </span>
                      <span>
                        <strong>{formatAverage(day.average)}</strong> average
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.menuButton}
                    aria-label="Day actions"
                    aria-haspopup="menu"
                    aria-expanded={menuKey === dayMenu}
                    onClick={() => setMenuKey((current) => (current === dayMenu ? null : dayMenu))}
                  >
                    <IconEllipsisVertical className={styles.menuIcon} />
                  </button>
                  {menuKey === dayMenu ? (
                    <div className={styles.menu} role="menu">
                      <button
                        type="button"
                        className={styles.menuItem}
                        role="menuitem"
                        onClick={() => void removeDay(day)}
                      >
                        Delete reviews for this day
                      </button>
                    </div>
                  ) : null}
                </div>
                {open ? (
                  <ul className={styles.reviews}>
                    {day.items.map((item) => {
                      const itemMenu = `item:${item.id}`;
                      return (
                        <li key={item.id} className={styles.review}>
                          <div
                            className={styles.reviewRow}
                            ref={menuKey === itemMenu ? menuRef : undefined}
                          >
                            <div>
                              <strong>Rating: {item.rating}/5</strong>
                              <p>{item.comment || "No comment"}</p>
                              <span className={styles.meta}>
                                {item.session_id || "No session"} · {formatWhen(item.created_at)}
                              </span>
                            </div>
                            <button
                              type="button"
                              className={styles.menuButton}
                              aria-label="Review actions"
                              aria-haspopup="menu"
                              aria-expanded={menuKey === itemMenu}
                              onClick={() =>
                                setMenuKey((current) => (current === itemMenu ? null : itemMenu))
                              }
                            >
                              <IconEllipsisVertical className={styles.menuIcon} />
                            </button>
                            {menuKey === itemMenu ? (
                              <div className={styles.menu} role="menu">
                                <button
                                  type="button"
                                  className={styles.menuItem}
                                  role="menuitem"
                                  onClick={() => void removeOne(item)}
                                >
                                  Delete review
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
