import { AskForm } from "@/features/conversation/components/AskForm";
import { MessageList } from "@/features/conversation/components/MessageList";
import { useConversation } from "@/features/conversation/hooks/useConversation";
import { RecordButton } from "@/features/voice/components/RecordButton";
import styles from "./ChatPanel.module.css";

export function ChatPanel() {
  const { messages, status, error, ask } = useConversation();
  const busy = status === "processing";

  return (
    <section className={styles.panel} aria-label="Conversation with Lena">
      <div className={styles.messages}>
        <MessageList messages={messages} />
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      {busy ? <p className={styles.status}>Thinking…</p> : null}
      <RecordButton disabled={busy} onTranscribed={ask} />
      <AskForm disabled={busy} onAsk={ask} />
    </section>
  );
}
