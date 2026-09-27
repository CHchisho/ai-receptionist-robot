import type { ChatMessage } from "@/features/conversation/types";
import { LinkChip } from "@/features/qr/LinkChip";
import { LinkifiedText } from "@/features/qr/LinkifiedText";
import { IconPlay, IconStop } from "@/shared/icons";
import styles from "./MessageList.module.css";

type Props = {
  messages: ChatMessage[];
  activeMessageId: string | null;
  activeProgress: number;
  onTogglePlayback: (message: ChatMessage) => void;
};

export function MessageList({
  messages,
  activeMessageId,
  activeProgress,
  onTogglePlayback,
}: Props) {
  return (
    <ol className={styles.list} aria-live="polite">
      {messages.map((message) => {
        const isPlaying = activeMessageId === message.id;
        const isPending = Boolean(message.pending);
        const canPlay =
          message.role === "assistant" &&
          !isPending &&
          (Boolean(message.audioBase64) || message.id === "welcome");

        return (
          <li
            key={message.id}
            className={
              message.role === "user"
                ? styles.user
                : isPending
                  ? `${styles.assistant} ${styles.pending}`
                  : styles.assistant
            }
            onClick={() => {
              if (canPlay) {
                onTogglePlayback(message);
              }
            }}
          >
            <div className={styles.messageHeader}>
              <span className={styles.role}>{message.role === "user" ? "You" : "Lena"}</span>
              <time className={styles.time}>
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              {canPlay ? (
                <span className={styles.playback} aria-hidden="true">
                  {isPlaying ? (
                    <IconStop className={styles.playbackIcon} />
                  ) : (
                    <IconPlay className={styles.playbackIcon} />
                  )}
                </span>
              ) : null}
            </div>

            {isPending ? (
              <div className={styles.loader} role="status" aria-label="Lena is preparing an answer" />
            ) : (
              <p className={styles.body}>
                <LinkifiedText text={message.content} />
              </p>
            )}

            {message.role === "assistant" && message.links?.length ? (
              <div className={styles.links}>
                {message.links.map((link) => (
                  <LinkChip key={link.url} url={link.url} label={link.label} />
                ))}
              </div>
            ) : null}

            {message.role === "assistant" && message.route ? (
              <section className={styles.routeCard} aria-label="Route details">
                <div>
                  <span className={styles.routeLabel}>Where</span>
                  <strong>{message.route.name}</strong>
                </div>
                <div className={styles.routeGrid}>
                  <div>
                    <span className={styles.routeLabel}>Floor</span>
                    <strong>{message.route.floor}</strong>
                  </div>
                  <div>
                    <span className={styles.routeLabel}>Landmark</span>
                    <strong>{message.route.landmark}</strong>
                  </div>
                </div>
                <p>{message.route.directions}</p>
              </section>
            ) : null}

            {canPlay && isPlaying ? (
              <div className={styles.progressTrack}>
                <div className={styles.progressBar} style={{ width: `${activeProgress}%` }} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
