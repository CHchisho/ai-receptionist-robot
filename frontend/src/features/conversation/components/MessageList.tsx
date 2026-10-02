import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { ChatMessage } from "@/features/conversation/types";
import { mediaSrc } from "@/features/content/api";
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
            onClick={(event) => {
              if (!event.currentTarget.contains(event.target as Node)) {
                return;
              }
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

            {message.role === "assistant" && message.card ? (
              <div className={styles.contentCard}>
                {message.card.image_url ? (
                  <CardPhoto src={message.card.image_url} alt={message.card.title} />
                ) : null}
                <strong>{message.card.title}</strong>
                <p>{message.card.description}</p>
                {message.card.kind === "demo" && message.card.location ? (
                  <span>Location: {message.card.location}</span>
                ) : null}
                {message.card.kind === "event" ? (
                  <span>
                    {message.card.event_time} · {message.card.room}
                  </span>
                ) : null}
              </div>
            ) : null}

            {message.role === "assistant" && message.links?.length ? (
              <div className={styles.links}>
                {message.links.map((link) => (
                  <LinkChip key={link.url} url={link.url} label={link.label} />
                ))}
              </div>
            ) : null}

            {message.role === "assistant" && message.route ? (
              <section className={styles.routeCard} aria-label="Route details">
                {message.route.image_url ? (
                  <CardPhoto src={message.route.image_url} alt={message.route.name} />
                ) : null}
                <div className={styles.routeBody}>
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
                </div>
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

function CardPhoto({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const resolved = mediaSrc(src);
  if (!resolved) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={styles.cardPhotoButton}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <img className={styles.cardPhoto} src={resolved} alt={alt} />
      </button>
      {open ? <PhotoLightbox src={resolved} alt={alt} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function PhotoLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function dismiss(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onCloseRef.current();
  }

  return createPortal(
    <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={alt} onClick={dismiss}>
      <button ref={closeRef} type="button" className={styles.lightboxClose} onClick={dismiss}>
        Close
      </button>
      <div className={styles.lightboxStage}>
        <img className={styles.lightboxImage} src={src} alt={alt} onClick={dismiss} />
      </div>
    </div>,
    document.body,
  );
}
