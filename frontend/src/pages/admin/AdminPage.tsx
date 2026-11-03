import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ContentPanel } from "@/features/content/ContentPanel";
import { FeedbackPanel } from "@/features/feedback/FeedbackPanel";
import { HistoryPanel } from "@/features/history/HistoryPanel";
import { SourcesPanel } from "@/features/knowledge/SourcesPanel";
import { MapPanel } from "@/features/map/MapPanel";
import styles from "./AdminPage.module.css";

type KioskMode = "chat" | "survey";
type AdminSection = "settings" | "content" | "sources" | "map" | "history" | "feedback";

const SECTIONS: { id: AdminSection; label: string }[] = [
  { id: "settings", label: "Basic settings" },
  { id: "content", label: "Demos & events" },
  { id: "sources", label: "Knowledge sources" },
  { id: "map", label: "Map" },
  { id: "history", label: "Chat history" },
  { id: "feedback", label: "Feedback" },
];

export function AdminPage() {
  const [kioskMode, setKioskMode] = useState<KioskMode>("chat");
  const [kioskError, setKioskError] = useState<string | null>(null);
  const [welcomeText, setWelcomeText] = useState("");
  const [savedWelcome, setSavedWelcome] = useState("");
  const [welcomeError, setWelcomeError] = useState<string | null>(null);
  const [welcomeSaving, setWelcomeSaving] = useState(false);
  const [section, setSection] = useState<AdminSection>("settings");

  useEffect(() => {
    fetch("/api/v1/kiosk/settings")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load kiosk settings");
        }
        return response.json();
      })
      .then((data: { mode: KioskMode; welcome_text: string }) => {
        setKioskMode(data.mode);
        setWelcomeText(data.welcome_text);
        setSavedWelcome(data.welcome_text);
        setKioskError(null);
      })
      .catch(() => {
        setKioskError("Could not load basic settings.");
      });
  }, []);

  function updateKioskMode(mode: KioskMode) {
    fetch("/api/v1/kiosk/mode", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update kiosk mode");
        }
        return response.json();
      })
      .then((data: { mode: KioskMode }) => {
        setKioskMode(data.mode);
        setKioskError(null);
      })
      .catch(() => {
        setKioskError("Could not update reception mode.");
      });
  }

  function saveWelcome() {
    const text = welcomeText.trim();
    if (!text || text === savedWelcome || welcomeSaving) {
      return;
    }
    setWelcomeSaving(true);
    setWelcomeError(null);
    fetch("/api/v1/kiosk/welcome", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update welcome message");
        }
        return response.json();
      })
      .then((data: { text: string }) => {
        setWelcomeText(data.text);
        setSavedWelcome(data.text);
        setWelcomeSaving(false);
      })
      .catch(() => {
        setWelcomeSaving(false);
        setWelcomeError("Could not save the welcome message.");
      });
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.title}>Admin</h1>
        </div>
        <Link className={styles.back} to="/">
          Back to receptionist
        </Link>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Admin sections">
        {SECTIONS.map((item) => {
          const selected = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`admin-tab-${item.id}`}
              className={selected ? styles.tabActive : styles.tab}
              aria-selected={selected}
              aria-controls={`admin-panel-${item.id}`}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        className={styles.content}
        role="tabpanel"
        id={`admin-panel-${section}`}
        aria-labelledby={`admin-tab-${section}`}
      >
        {section === "settings" ? (
          <>
            <section className={`${styles.card} ${styles.modeCard}`}>
              <h2 className={styles.cardTitle}>Reception mode</h2>
              <p className={styles.copy}>
                Choose what visitors see on the reception tablet.
              </p>

              <div className={styles.modeButtons}>
                <button
                  type="button"
                  className={kioskMode === "chat" ? styles.activeMode : styles.modeButton}
                  onClick={() => updateKioskMode("chat")}
                >
                  Chat
                </button>

                <button
                  type="button"
                  className={kioskMode === "survey" ? styles.activeMode : styles.modeButton}
                  onClick={() => updateKioskMode("survey")}
                >
                  Survey
                </button>
              </div>

              {kioskError ? <p className={styles.error}>{kioskError}</p> : null}
            </section>

            <section className={`${styles.card} ${styles.modeCard}`}>
              <h2 className={styles.cardTitle}>Welcome message</h2>
              <p className={styles.copy}>
                Lena says this first. Saving prepares the voice clip again, so it can take a moment.
              </p>
              <textarea
                className={styles.textarea}
                value={welcomeText}
                maxLength={1000}
                rows={4}
                aria-label="Welcome message"
                onChange={(event) => setWelcomeText(event.target.value)}
              />
              <div className={styles.welcomeActions}>
                <button
                  type="button"
                  className={styles.saveButton}
                  disabled={
                    welcomeSaving ||
                    welcomeText.trim().length === 0 ||
                    welcomeText.trim() === savedWelcome
                  }
                  onClick={saveWelcome}
                >
                  {welcomeSaving ? "Preparing voice…" : "Save welcome"}
                </button>
              </div>
              {welcomeError ? <p className={styles.error}>{welcomeError}</p> : null}
            </section>
          </>
        ) : null}

        {section === "content" ? <ContentPanel /> : null}

        {section === "sources" ? <SourcesPanel /> : null}
        {section === "map" ? <MapPanel /> : null}
        {section === "history" ? <HistoryPanel /> : null}

        {section === "feedback" ? <FeedbackPanel /> : null}
      </div>
    </main>
  );
}
