import { useState } from "react";
import type { ChatMessage } from "@/features/conversation/types";
import { LinkifiedText } from "@/features/qr/LinkifiedText";
import { QRPopup } from "@/features/qr/QRPopup";
import styles from "./MessageList.module.css";

type Props = {
  messages: ChatMessage[];
};

export function MessageList({ messages }: Props) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  return (
    <>
      <ol className={styles.list} aria-live="polite">
        {messages.map((message) => (
          <li
            key={message.id}
            className={
              message.role === "user" ? styles.user : styles.assistant
            }
          >
            <span className={styles.role}>
              {message.role === "user" ? "You" : "Lena"}
            </span>

            <p className={styles.body}>
              <LinkifiedText
                text={message.content}
                onLinkClick={(url) => setSelectedUrl(url)}
              />
            </p>
          </li>
        ))}
      </ol>

      {selectedUrl ? (
        <QRPopup
          url={selectedUrl}
          onClose={() => setSelectedUrl(null)}
        />
      ) : null}
    </>
  );
}
