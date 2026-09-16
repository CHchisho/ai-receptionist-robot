import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./AdminPage.module.css";

type FeedbackItem = {
  id: number;
  rating: number;
  comment: string;
  session_id: string | null;
  created_at: string;
};

export function AdminPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);

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
      })
      .catch((error) => {
        console.error("Failed to load feedback:", error);
      });
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Staff</p>
          <h1 className={styles.title}>Knowledge settings</h1>
        </div>
        <Link className={styles.back} to="/">
          Back to receptionist
        </Link>
      </header>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Sources</h2>
        <p className={styles.copy}>
          Content owners will add, review, and remove approved documents and URLs here.
          The ingestion pipeline is not connected yet.
        </p>
      </section>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Visitor feedback</h2>

        {feedback.length === 0 ? (
          <p className={styles.copy}>No feedback yet.</p>
        ) : (
          feedback.map((item) => (
            <div key={item.id}>
              <strong>Rating: {item.rating}/5</strong>
              <p>{item.comment || "No comment"}</p>
              <small>
                Session: {item.session_id || "Unknown"} ·{" "}
                {new Date(item.created_at).toLocaleString()}
              </small>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
