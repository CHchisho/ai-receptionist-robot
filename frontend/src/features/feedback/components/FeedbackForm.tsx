import { useState } from "react";

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

  return (
    <div>
      <h2>How was your experience?</h2>

      <div>
        {[
          { value: 1, emoji: "😞" },
          { value: 2, emoji: "😕" },
          { value: 3, emoji: "😐" },
          { value: 4, emoji: "🙂" },
          { value: 5, emoji: "😄" },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => {
              setRating(item.value);
              setSubmitted(false);
            }}
          >
            {item.emoji}
          </button>
        ))}
      </div>

      {submitted && <p>Thank you for your feedback!</p>}

      {rating && (
        <div>
          <p>Would you like to leave detailed feedback?</p>
          <textarea
            placeholder="Write your feedback here..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <br />
          <button onClick={handleSubmit}>Submit feedback</button>
        </div>
      )}
    </div>
  );
}