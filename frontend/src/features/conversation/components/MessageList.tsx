import { useEffect, useState } from "react";
import type { ChatMessage } from "@/features/conversation/types";
import { LinkifiedText } from "@/features/qr/LinkifiedText";
import { QRPopup } from "@/features/qr/QRPopup";
import { createAudio } from "@/features/voice/services/ttsClient";
import styles from "./MessageList.module.css";

type Props = {
  messages: ChatMessage[];
};

export function MessageList({ messages }: Props) {
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);

  useEffect(() => {
    return () => {
      setPlayingMessageId(null);
      setAudioProgress(0);
    };
  }, []);

  function replayAudio(message: ChatMessage) {
    if (!message.audioBase64) {
      return;
    }

    const audio = createAudio(message.audioBase64);

    setPlayingMessageId(message.id);
    setAudioProgress(0);

    audio.addEventListener("timeupdate", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        const progress = (audio.currentTime / audio.duration) * 100;
        setAudioProgress(Math.min(progress, 100));
      }
    });

audio.addEventListener("loadedmetadata", () => {
  setAudioProgress(0);
});

    audio.addEventListener("ended", () => {
      setAudioProgress(100);

      setTimeout(() => {
        setPlayingMessageId(null);
        setAudioProgress(0);
      }, 150);
    });

    void audio.play();
  }

  return (
    <>
      <ol className={styles.list} aria-live="polite">
        {messages.map((message) => (
          <li
            key={message.id}
            className={
              message.role === "user" ? styles.user : styles.assistant
            }
            onClick={() => {
              if (message.role === "assistant" && message.audioBase64) {
                replayAudio(message);
              }
            }}
          >
            <div className={styles.messageHeader}>
              <span className={styles.role}>
                {message.role === "user" ? "You" : "Lena"}
            </span>

            <time className={styles.time}>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>

            <p className={styles.body}>
              <LinkifiedText
                text={message.content}
                onLinkClick={(url) => setSelectedUrl(url)}
              />
            </p>

            {message.role === "assistant" && message.links?.length ? (
              <div>
                {message.links.map((link) => (
                  <button
                    key={link.url}
                    type="button"
                    onClick={() => setSelectedUrl(link.url)}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            ) : null}

            {message.role === "assistant" && message.audioBase64 ? (
              <>
                {playingMessageId === message.id ? (
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                ) : null}
                </>
              ) : null}
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