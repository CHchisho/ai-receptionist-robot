import { useState } from "react";
import styles from "./FeedbackForm.module.css";

type FeedbackFormProps = {
  sessionId?: string;
};

export function FeedbackForm({ sessionId }: FeedbackFormProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating === null) return;

    setError("");

    try {
      const response = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          comment,
          session_id: sessionId ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      setSubmitted(true);
      setRating(null);
      setComment("");

      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Feedback submission failed:", error);
      setError("Failed to save feedback. Please try again.");
    }
  };

  const ratings = [
    { value: 1, emoji: "😞" },
    { value: 2, emoji: "😕" },
    { value: 3, emoji: "😐" },
    { value: 4, emoji: "🙂" },
    { value: 5, emoji: "😄" },
  ];

  return (
    <section className={styles.feedback}>
      <h2 className={styles.title}>How was your experience?</h2>

      <div className={styles.ratings}>
        {ratings.map((item) => (
          <button
            key={item.value}
            className={`${styles.ratingButton} ${
              rating === item.value ? styles.selected : ""
            }`}
            onClick={() => {
              setRating(item.value);
              setSubmitted(false);
            }}
            aria-label={`Rating ${item.value} out of 5`}
          >
            {item.emoji}
          </button>
        ))}
      </div>

      {rating && (
        <div className={styles.details}>
          <p className={styles.question}>
            Would you like to leave detailed feedback?
          </p>

          <textarea
            className={styles.textarea}
            placeholder="Write your feedback here..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <button
            className={styles.submitButton}
            onClick={handleSubmit}
          >
            Submit feedback
          </button>

          {error && (
            <p role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      {submitted && (
        <p className={styles.thankYou}>
          Thank you for your feedback!
        </p>
      )}
    </section>
  );
}