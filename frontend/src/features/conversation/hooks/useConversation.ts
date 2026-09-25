import { useRef, useState } from "react";
import { askQuestion } from "@/features/conversation/api";
import type {
  ChatLink,
  ChatMessage,
} from "@/features/conversation/types";
import {
  createAudioPlayback,
  synthesizeSpeech,
  type AudioPlayback,
} from "@/features/voice/services/ttsClient";
import type { UiState } from "@/shared/types/ui";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello, I am Lena. Ask me about Nokia Espoo, the Innovation Garage, or how to find your way.",
  createdAt: new Date().toISOString(),
};

function createId() {
  return crypto.randomUUID();
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function useConversation() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    WELCOME_MESSAGE,
  ]);
  const [status, setStatus] = useState<UiState>("welcome");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [welcomeSpoken, setWelcomeSpoken] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(
    null,
  );
  const [audioProgress, setAudioProgress] = useState(0);

  const playbackRef = useRef<AudioPlayback | null>(null);
  const welcomeStartedRef = useRef(false);

  async function playBase64Audio(
    audioBase64: string,
    messageId?: string,
  ) {
    playbackRef.current?.stop();

    setStatus("speaking");

    if (messageId) {
      setPlayingMessageId(messageId);
      setAudioProgress(0);
    }

    const playback = createAudioPlayback(audioBase64);
    playbackRef.current = playback;

    const removeProgressListener = playback.onProgress?.(
      (progress) => {
        if (messageId) {
          setAudioProgress(progress);
        }
      },
    );

    let completed = false;

    try {
      completed = await playback.finished;
    } catch {
      // Playback issues should not block the conversation.
    } finally {
      removeProgressListener?.();

      if (playbackRef.current === playback) {
        playbackRef.current = null;
      }
    }

    if (!messageId || playbackRef.current !== null) {
      return;
    }

    if (completed) {
      setAudioProgress(100);
      await waitForNextPaint();

      if (playbackRef.current !== null) {
        return;
      }
    }

    setPlayingMessageId((current) => (current === messageId ? null : current));
    setAudioProgress(0);
  }

  async function ask(text: string) {
    const question = text.trim();

    if (
      !question ||
      status === "processing" ||
      status === "speaking"
    ) {
      return;
    }

    setError(null);
    setStatus("processing");

    const assistantMessageId = createId();
    const askedAt = new Date().toISOString();

    setMessages((current) => [
      ...current,
      {
        id: createId(),
        role: "user",
        content: question,
        createdAt: askedAt,
      },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: askedAt,
        pending: true,
      },
    ]);

    try {
      const response = await askQuestion(question, sessionId);

      setSessionId(response.session_id);

      const temporaryLinks: ChatLink[] =
        response.links.length > 0
          ? response.links
          : [
            {
              url: "https://www.nokia.com/",
              label: "Nokia website",
            },
          ];

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: response.answer,
                pending: false,
                links: temporaryLinks,
                audioBase64: response.audio_base64,
                route: response.route,
              }
            : message,
        ),
      );

      if (response.audio_base64) {
        await playBase64Audio(
          response.audio_base64,
          assistantMessageId,
        );
      }

      setStatus("idle");
    } catch {
      setMessages((current) => current.filter((message) => message.id !== assistantMessageId));
      setStatus("error");
      setError("Could not get an answer. Please try again.");
    }
  }

  async function speakWelcomeOnce() {
    if (
      welcomeStartedRef.current ||
      welcomeSpoken ||
      status === "processing" ||
      status === "speaking"
    ) {
      return;
    }

    welcomeStartedRef.current = true;
    setError(null);
    setStatus("processing");

    try {
      const audioBase64 = await synthesizeSpeech(WELCOME_MESSAGE.content);
      setWelcomeSpoken(true);

      if (audioBase64) {
        setMessages((current) =>
          current.map((message) =>
            message.id === "welcome" ? { ...message, audioBase64 } : message,
          ),
        );
        await playBase64Audio(audioBase64, "welcome");
      }

      setStatus("idle");
    } catch {
      welcomeStartedRef.current = false;
      setStatus("idle");
      setError("Could not play the welcome message.");
    }
  }

  function stopSpeaking() {
    playbackRef.current?.stop();
    playbackRef.current = null;
    setPlayingMessageId(null);
    setAudioProgress(0);
    setStatus("idle");
  }

  function toggleMessagePlayback(message: ChatMessage) {
    if (message.role !== "assistant") {
      return;
    }

    if (playingMessageId === message.id && playbackRef.current) {
      stopSpeaking();
      return;
    }

    if (message.audioBase64) {
      void playBase64Audio(message.audioBase64, message.id);
      return;
    }

    if (message.id !== "welcome") {
      return;
    }

    void (async () => {
      setStatus("processing");
      try {
        const audioBase64 = await synthesizeSpeech(WELCOME_MESSAGE.content);
        if (!audioBase64) {
          setStatus("idle");
          return;
        }
        setMessages((current) =>
          current.map((item) =>
            item.id === "welcome" ? { ...item, audioBase64 } : item,
          ),
        );
        setWelcomeSpoken(true);
        welcomeStartedRef.current = true;
        await playBase64Audio(audioBase64, "welcome");
        setStatus("idle");
      } catch {
        setStatus("idle");
        setError("Could not play the welcome message.");
      }
    })();
  }

  return {
    messages,
    status,
    error,
    ask,
    sessionId,
    stopSpeaking,
    speakWelcomeOnce,
    welcomeSpoken,
    playingMessageId,
    audioProgress,
    toggleMessagePlayback,
  };
}