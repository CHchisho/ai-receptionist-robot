import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HistoryPanel } from "@/features/history/HistoryPanel";
import { SourcesPanel } from "@/features/knowledge/SourcesPanel";
import styles from "./AdminPage.module.css";

type FeedbackItem = {
  id: number;
  rating: number;
  comment: string;
  session_id: string | null;
  created_at: string;
};

type KioskMode = "chat" | "survey";

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
        <div>
          <p className={styles.eyebrow}>Staff</p>
          <h1 className={styles.title}>Admin</h1>
        </div>
        <Link className={styles.back} to="/">
          Back to receptionist
        </Link>
      </header>
      <section className={styles.card}>
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
      <div className={styles.grid}>
        <SourcesPanel />
        <div className={styles.side}>
          <HistoryPanel />
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
        </div>
      </div>
    </main>
  );
}
