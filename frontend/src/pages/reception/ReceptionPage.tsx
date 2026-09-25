import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChatPanel } from "@/features/conversation/components/ChatPanel";
import { useConversation } from "@/features/conversation/hooks/useConversation";
import { FeedbackForm } from "@/features/feedback/components/FeedbackForm";
import styles from "./ReceptionPage.module.css";

type KioskMode = "chat" | "survey";

export function ReceptionPage() {
  const [kioskMode, setKioskMode] = useState<KioskMode>("chat");
  const [ttsVolume, setTtsVolume] = useState(() => {
    const savedVolume = Number(localStorage.getItem("tts-volume") ?? "1");
    return Math.min(1, Math.max(0, savedVolume));
  });
  const conversation = useConversation();

  useEffect(() => {
    fetch("/api/v1/kiosk/mode")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load kiosk mode");
        }
        return response.json();
      })
      .then((data: { mode: KioskMode }) => {
        setKioskMode(data.mode);
      })
      .catch(() => {
        setKioskMode("chat");
      });
  }, []);

  function handleVolumeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const volume = Number(event.target.value);
    setTtsVolume(volume);
    localStorage.setItem("tts-volume", String(volume));
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Nokia Espoo Innovation Garage</p>
          <h1 className={styles.title}>Lena</h1>
        </div>

        <div className={styles.headerActions}>
          <label className={styles.volumeControl}>
            Volume
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={ttsVolume}
              onChange={handleVolumeChange}
              aria-label="TTS volume"
            />
          </label>

          <Link className={styles.adminLink} to="/admin">
            Admin
          </Link>
        </div>
      </header>

      {kioskMode === "survey" ? (
        <FeedbackForm sessionId={conversation.sessionId} />
      ) : (
        <ChatPanel conversation={conversation} />
      )}
    </main>
  );
}
