import { useEffect, useRef, useState } from "react";
import { AskForm } from "@/features/conversation/components/AskForm";
import { MessageList } from "@/features/conversation/components/MessageList";
import { PresencePrompt } from "@/features/conversation/components/PresencePrompt";
import { useConversation } from "@/features/conversation/hooks/useConversation";
import { RecordButton } from "@/features/voice/components/RecordButton";
import { env } from "@/shared/config/env";
import { IconPenToSquare } from "@/shared/icons";
import styles from "./ChatPanel.module.css";

const PRESENCE_CONFIRM_MS = 15_000;
const NEW_CHAT_DELAY_MS = 5_000;

type ChatPanelProps = {
  conversation: ReturnType<typeof useConversation>;
  onIdleTimeout: () => void;
  onNewChat: () => void;
};

export function ChatPanel({
  conversation,
  onIdleTimeout,
  onNewChat,
}: ChatPanelProps) {
  const {
    messages,
    status,
    error,
    ask,
    playingMessageId,
    audioProgress,
    toggleMessagePlayback,
  } = conversation;

  const [showTypeForm, setShowTypeForm] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "processing"
  >("idle");
  const [currentLanguage, setCurrentLanguage] = useState<string>("en");
  const [draft, setDraft] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  const busy = status === "processing" || status === "speaking";
  const isListening = recordingState === "recording";
  const typeDisabled = busy || recordingState !== "idle";
  const hasReply = messages.some(
    (message) => message.role === "assistant" && message.id !== "welcome",
  );
  const lastQuestion = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const lastReply = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.id !== "welcome");
  const lastMessageId = messages.at(-1)?.id ?? "";
  const idlePaused = busy || recordingState !== "idle";
  const userIsComposing = draft.trim().length > 0 || recordingState !== "idle";
  const canOfferNewChat =
    Boolean(lastReply) && status === "idle" && !userIsComposing;

  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = messagesRef.current;
    if (!node) return;

    node.scrollTo({
      top: node.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  useEffect(() => {
    setShowNewChat(false);

    if (!canOfferNewChat) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowNewChat(true);
    }, NEW_CHAT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [canOfferNewChat, lastReply?.id]);

  function handleTranscribed(text: string, language: string) {
    setVoiceNotice(null);
    setCurrentLanguage(language);
    ask(text, language);
  }

  function handleEmptyTranscription() {
    setVoiceNotice("I didn't catch that, please try again");
  }

  function handleRecordingStateChange(
    nextState: "idle" | "recording" | "processing",
  ) {
    setRecordingState(nextState);

    if (nextState === "recording") {
      setVoiceNotice(null);
    }
  }

  const recordHint = isListening
    ? "Listening"
    : recordingState === "processing" || status === "processing"
      ? "Thinking…"
      : "Tap to speak";

  return (
    <section className={styles.panel} aria-label="Conversation with Lena">
      {showNewChat ? (
        <button className={styles.newChat} type="button" onClick={onNewChat}>
          <IconPenToSquare className={styles.newChatIcon} />
          New chat
        </button>
      ) : null}

      <div className={styles.messages} ref={messagesRef}>
        <MessageList
          messages={messages}
          activeMessageId={playingMessageId}
          activeProgress={audioProgress}
          onTogglePlayback={toggleMessagePlayback}
        />
      </div>

      <div
        className={`${styles.composer} ${
          hasReply ? styles.composerDocked : styles.composerCentered
        }`}
      >
        {error ? <p className={styles.error}>{error}</p> : null}

        {voiceNotice ? (
          <p className={styles.notice}>{voiceNotice}</p>
        ) : null}

        {showTypeForm ? (
          <>
            <AskForm
              disabled={typeDisabled}
              onAsk={(text) => {
                setDraft("");
                ask(text, currentLanguage);
              }}
              onDraftChange={setDraft}
            />
            <button
              className={styles.modeToggle}
              type="button"
              onClick={() => {
                setDraft("");
                setShowTypeForm(false);
              }}
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

      <PresencePrompt
        active={Boolean(lastQuestion) && !idlePaused}
        resetKey={`${lastMessageId}:${draft}`}
        idleMs={env.chatIdleSeconds * 1000}
        confirmMs={PRESENCE_CONFIRM_MS}
        onTimeout={onIdleTimeout}
      />
    </section>
  );
}