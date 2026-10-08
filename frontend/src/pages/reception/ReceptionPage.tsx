import { useEffect, useState } from "react";
import { ChatPanel } from "@/features/conversation/components/ChatPanel";
import { useConversation } from "@/features/conversation/hooks/useConversation";
import { FeedbackForm } from "@/features/feedback/components/FeedbackForm";
import { VolumeControl } from "@/features/voice/components/VolumeControl";
import styles from "./ReceptionPage.module.css";

type KioskMode = "chat" | "survey";

export function ReceptionPage() {
  const [kioskMode, setKioskMode] = useState<KioskMode>("chat");
  const [panelKey, setPanelKey] = useState(0);
  const conversation = useConversation();

  function handleNewChat() {
    conversation.startNewChat();
    setPanelKey((key) => key + 1);
  }

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

  return (
    <main className={styles.page}>
      {/* <Link className={styles.adminLink} to="/admin">
        Admin
      </Link> */}

      <header className={styles.header}>
        <div className={styles.brand}>
          <p className={styles.place}>Nokia Espoo Innovation Garage</p>
          <h1 className={styles.title}>Lena</h1>
        </div>
        <div className={styles.side}>
          <VolumeControl />
        </div>
      </header>

      {kioskMode === "survey" ? (
        <FeedbackForm sessionId={conversation.sessionId} />
      ) : (
        <ChatPanel
          key={panelKey}
          conversation={conversation}
          onIdleTimeout={handleNewChat}
          onNewChat={handleNewChat}
        />
      )}
    </main>
  );
}
