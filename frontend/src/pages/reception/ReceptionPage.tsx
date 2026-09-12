import { useState } from "react";
import { Link } from "react-router-dom";
import { ChatPanel } from "@/features/conversation/components/ChatPanel";
import { FeedbackForm } from "@/features/feedback/components/FeedbackForm";
import styles from "./ReceptionPage.module.css";

export function ReceptionPage() {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Nokia Innovation Garage</p>
          <h1 className={styles.title}>Lena</h1>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.feedbackButton}
            onClick={() => setShowFeedback((current) => !current)}
          >
            {showFeedback ? "Back to chat" : "Feedback"}
          </button>

          <Link className={styles.adminLink} to="/admin">
            Admin
          </Link>
        </div>
      </header>

      {showFeedback ? <FeedbackForm /> : <ChatPanel />}
    </main>
  );
}
