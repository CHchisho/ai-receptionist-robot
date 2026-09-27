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
    messages,
    status,
    error,
    ask,
    speakWelcomeOnce,
    welcomeSpoken,
    playingMessageId,
    audioProgress,
    toggleMessagePlayback,
  } = conversation;
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "processing">("idle");
  const busy = status === "processing" || status === "speaking";
  const isStartingWelcome = !welcomeSpoken && status === "processing";
  const isListening = recordingState === "recording";
  const typeDisabled = busy || recordingState !== "idle";
  const hasReply = messages.some((message) => message.role === "assistant" && message.id !== "welcome");
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = messagesRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
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

  const recordHint = isListening
    ? "Listening"
    : recordingState === "processing" || status === "processing" || isStartingWelcome
      ? "Thinking…"
      : "Tap to speak";

  return (
    <section className={styles.panel} aria-label="Conversation with Lena">
      <div className={styles.messages} ref={messagesRef}>
        <MessageList
          messages={messages}
          activeMessageId={playingMessageId}
          activeProgress={audioProgress}
          onTogglePlayback={toggleMessagePlayback}
        />
      </div>

      <div
        className={`${styles.composer} ${hasReply ? styles.composerDocked : styles.composerCentered}`}
      >
        {error ? <p className={styles.error}>{error}</p> : null}
        {voiceNotice ? <p className={styles.notice}>{voiceNotice}</p> : null}

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
        ) : showTypeForm ? (
          <>
            <AskForm disabled={typeDisabled} onAsk={ask} />
            <button
              className={styles.modeToggle}
              type="button"
              onClick={() => setShowTypeForm(false)}
              disabled={typeDisabled}
            >
              Tap to speak
            </button>
          </>
        ) : (
          <>
            <RecordButton
              disabled={busy}
              onTranscribed={handleTranscribed}
              onEmptyTranscription={handleEmptyTranscription}
              onStateChange={handleRecordingStateChange}
            />
            <div className={styles.recordLabels}>
              <p className={styles.recordHint}>{recordHint}</p>
              <button
                className={styles.modeToggle}
                type="button"
                onClick={() => setShowTypeForm(true)}
                disabled={typeDisabled}
              >
                Type instead
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
