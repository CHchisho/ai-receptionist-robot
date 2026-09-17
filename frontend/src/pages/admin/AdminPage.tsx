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
        setFeedbackError(null);
      })
      .catch(() => {
        setFeedbackError("Could not load visitor feedback.");
      });
  }, []);

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
