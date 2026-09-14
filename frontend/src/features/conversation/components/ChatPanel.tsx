import { useEffect, useRef } from "react";
import { AskForm } from "@/features/conversation/components/AskForm";
import { MessageList } from "@/features/conversation/components/MessageList";
import { useConversation } from "@/features/conversation/hooks/useConversation";
import { RecordButton } from "@/features/voice/components/RecordButton";
import styles from "./ChatPanel.module.css";

export function ChatPanel() {
  const { messages, status, error, ask } = useConversation();
  const busy = status === "processing";
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = messagesRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, status]);

  return (
    <section className={styles.panel} aria-label="Conversation with Lena">
      <div className={styles.chat}>
        <div className={styles.messages} ref={messagesRef}>
          <MessageList messages={messages} />
        </div>
        <div className={styles.recordOverlay}>
          {error ? <p className={styles.error}>{error}</p> : null}
          {busy ? <p className={styles.status}>Thinking…</p> : null}
          <RecordButton disabled={busy} onTranscribed={ask} />
        </div>
      </div>
      <AskForm disabled={busy} onAsk={ask} />
    </section>
  );
}
