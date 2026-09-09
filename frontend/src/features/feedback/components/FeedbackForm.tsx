import { useState } from "react";
import styles from "./FeedbackForm.module.css";

export function FeedbackForm() {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    console.log("Rating:", rating);
    console.log("Comment:", comment);

    setSubmitted(true);
    setRating(null);
    setComment("");
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
            className={styles.ratingButton}
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