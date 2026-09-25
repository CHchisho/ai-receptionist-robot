import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HistoryPanel } from "@/features/history/HistoryPanel";
import { SourcesPanel } from "@/features/knowledge/SourcesPanel";
import { MapPanel } from "@/features/map/MapPanel";
import styles from "./AdminPage.module.css";

type FeedbackItem = {
  id: number;
  rating: number;
  comment: string;
  session_id: string | null;
  created_at: string;
};

type KioskMode = "chat" | "survey";
type AdminSection = "mode" | "sources" | "map" | "history" | "feedback";

const SECTIONS: { id: AdminSection; label: string }[] = [
  { id: "mode", label: "Reception mode" },
  { id: "sources", label: "Knowledge sources" },
  { id: "map", label: "Map" },
  { id: "history", label: "Chat history" },
  { id: "feedback", label: "Feedback" },
];

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [kioskMode, setKioskMode] = useState<KioskMode>("chat");
  const [kioskError, setKioskError] = useState<string | null>(null);
  const [section, setSection] = useState<AdminSection>("mode");

  useEffect(() => {
    fetch("/api/v1/kiosk/mode")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load kiosk mode");
        }
        return response.json();
      })
      .then((data: { mode: KioskMode }) => {
        setKioskMode(data.mode);
        setKioskError(null);
      })
      .catch(() => {
        setKioskError("Could not load reception mode.");
      });

    fetch("/api/v1/feedback")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load feedback");
        }
        return response.json();
      })
      .then((data: FeedbackItem[]) => {
        setFeedback(data);
        setFeedbackError(null);
      })
      .catch(() => {
        setFeedbackError("Could not load visitor feedback.");
      });
  }, []);

  function updateKioskMode(mode: KioskMode) {
    fetch("/api/v1/kiosk/mode", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update kiosk mode");
        }
        return response.json();
      })
      .then((data: { mode: KioskMode }) => {
        setKioskMode(data.mode);
        setKioskError(null);
      })
      .catch(() => {
        setKioskError("Could not update reception mode.");
      });
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.title}>Admin</h1>
        </div>
        <Link className={styles.back} to="/">
          Back to receptionist
        </Link>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Admin sections">
        {SECTIONS.map((item) => {
          const selected = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`admin-tab-${item.id}`}
              className={selected ? styles.tabActive : styles.tab}
              aria-selected={selected}
              aria-controls={`admin-panel-${item.id}`}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        className={styles.content}
        role="tabpanel"
        id={`admin-panel-${section}`}
        aria-labelledby={`admin-tab-${section}`}
      >
        {section === "mode" ? (
          <section className={`${styles.card} ${styles.modeCard}`}>
            <h2 className={styles.cardTitle}>Reception mode</h2>
            <p className={styles.copy}>
              Choose what visitors see on the reception tablet.
            </p>

            <div className={styles.modeButtons}>
              <button
                type="button"
                className={kioskMode === "chat" ? styles.activeMode : styles.modeButton}
                onClick={() => updateKioskMode("chat")}
              >
                Chat
              </button>

              <button
                type="button"
                className={kioskMode === "survey" ? styles.activeMode : styles.modeButton}
                onClick={() => updateKioskMode("survey")}
              >
                Survey
              </button>
            </div>

            {kioskError ? <p className={styles.error}>{kioskError}</p> : null}
          </section>
        ) : null}

        {section === "sources" ? <SourcesPanel /> : null}
        {section === "map" ? <MapPanel /> : null}
        {section === "history" ? <HistoryPanel /> : null}

        {section === "feedback" ? (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Visitor feedback</h2>
            <p className={styles.copy}>Ratings and comments from the reception tablet.</p>
            {feedbackError ? <p className={styles.error}>{feedbackError}</p> : null}
            {!feedbackError && feedback.length === 0 ? (
              <p className={styles.copy}>No feedback yet.</p>
            ) : null}
            {feedback.length > 0 ? (
              <ul className={styles.list}>
                {feedback.map((item) => (
                  <li key={item.id} className={styles.item}>
                    <strong>Rating: {item.rating}/5</strong>
                    <p>{item.comment || "No comment"}</p>
                    <span className={styles.meta}>
                      {item.session_id || "No session"} · {formatWhen(item.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
