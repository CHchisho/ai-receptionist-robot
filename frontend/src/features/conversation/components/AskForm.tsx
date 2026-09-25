import { FormEvent, useState } from "react";
import { IconArrowUp } from "@/shared/icons";
import styles from "./AskForm.module.css";

type Props = {
  disabled?: boolean;
  onAsk: (text: string) => void;
};

export function AskForm({ disabled, onAsk }: Props) {
  const [text, setText] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = text.trim();
    if (!value) {
      return;
    }
    onAsk(value);
    setText("");
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <input
          id="question"
          className={styles.input}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type a question…"
          autoComplete="off"
          disabled={disabled}
          aria-label="Your question"
        />
        <button className={styles.button} type="submit" disabled={disabled} aria-label="Send">
          <IconArrowUp className={styles.sendIcon} />
        </button>
      </div>
    </form>
  );
}
