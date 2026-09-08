import type { ChatMessage } from "@/features/conversation/types";
import styles from "./MessageList.module.css";

type Props = {
  messages: ChatMessage[];
};

export function MessageList({ messages }: Props) {
  return (
    <ol className={styles.list} aria-live="polite">
      {messages.map((message) => (
        <li
          key={message.id}
          className={message.role === "user" ? styles.user : styles.assistant}
        >
          <span className={styles.role}>{message.role === "user" ? "You" : "Lena"}</span>
          <p className={styles.body}>{message.content}</p>
        </li>
      ))}
    </ol>
  );
}
