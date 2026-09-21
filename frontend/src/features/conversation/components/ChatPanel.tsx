import { useEffect, useRef, useState } from "react";
import { AskForm } from "@/features/conversation/components/AskForm";
import { MessageList } from "@/features/conversation/components/MessageList";
import { useConversation } from "@/features/conversation/hooks/useConversation";
import { RecordButton } from "@/features/voice/components/RecordButton";
import styles from "./ChatPanel.module.css";

type ChatPanelProps = {
  conversation: ReturnType<typeof useConversation>;
};

export function ChatPanel({ conversation }: ChatPanelProps) {
  const {
  messages,status,error,ask,stopSpeaking,speakWelcomeOnce,welcomeSpoken,playingMessageId,audioProgress,
} = conversation;
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "processing">("idle");
  const busy = status === "processing" || status === "speaking";
  const isSpeaking = status === "speaking";
  const isStartingWelcome = !welcomeSpoken && status === "processing";
  const isListening = recordingState === "recording";
  const typeDisabled = busy || recordingState !== "idle";
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = messagesRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, status]);

  function handleTranscribed(text: string) {
    setVoiceNotice(null);
    ask(text);
  }

  function handleEmptyTranscription() {
    setVoiceNotice("I didn't catch that, please try again");
  }

  function handleRecordingStateChange(nextState: "idle" | "recording" | "processing") {
    setRecordingState(nextState);
    if (nextState === "recording") {
      setVoiceNotice(null);
    }
  }

  return (
    <section className={styles.panel} aria-label="Conversation with Lena">
      <div className={styles.chat}>
        <div className={styles.messages} ref={messagesRef}>
          <MessageList
            messages={messages}
            activeMessageId={playingMessageId}
            activeProgress={audioProgress}
          />
        </div>
        <div className={`${styles.recordOverlay} ${isListening ? styles.listeningOverlay : ""}`}>
          {error ? <p className={styles.error}>{error}</p> : null}
          {voiceNotice ? <p className={styles.notice}>{voiceNotice}</p> : null}
          {isStartingWelcome ? <p className={styles.status}>Starting Lena…</p> : null}
          {status === "processing" && welcomeSpoken ? <p className={styles.status}>Thinking…</p> : null}
          {isSpeaking ? <p className={styles.status}>Lena is speaking</p> : null}
          {isSpeaking ? (
            <button className={styles.stopButton} type="button" onClick={stopSpeaking}>
              Stop
            </button>
          ) : null}
          {!welcomeSpoken ? (
            <button
              className={styles.welcomeMicButton}
              type="button"
              onClick={speakWelcomeOnce}
              disabled={busy}
              aria-label="Start Lena"
            >
              <span className={styles.welcomeMicIcon} aria-hidden="true" />
              <span className={styles.welcomeMicText}>{isStartingWelcome ? "Starting…" : "Tap to start"}</span>
            </button>
          ) : (
            <RecordButton
              disabled={busy}
              onTranscribed={handleTranscribed}
              onEmptyTranscription={handleEmptyTranscription}
              onStateChange={handleRecordingStateChange}
            />
          )}
        </div>
      </div>
      {welcomeSpoken ? (
        <div className={styles.typeArea}>
          {!showTypeForm ? (
            <button className={styles.typeToggle} type="button" onClick={() => setShowTypeForm(true)} disabled={typeDisabled}>
              Type instead
            </button>
          ) : (
            <AskForm disabled={typeDisabled} onAsk={ask} />
          )}
        </div>
      ) : null}
    </section>
  );
}
