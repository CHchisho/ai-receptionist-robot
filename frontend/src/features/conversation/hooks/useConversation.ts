import { useEffect, useRef, useState } from "react";
import { askQuestion } from "@/features/conversation/api";
import type { ChatLink, ChatMessage } from "@/features/conversation/types";
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

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
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
  const welcomeSpokenRef = useRef(false);
  const welcomeAttemptRef = useRef(0);
  const chatEpochRef = useRef(0);
  const requestAbortRef = useRef<AbortController | null>(null);

  function beginRequest() {
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    return controller;
  }

  function cancelActiveWork() {
    chatEpochRef.current += 1;
    welcomeAttemptRef.current += 1;
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    playbackRef.current?.stop();
    playbackRef.current = null;
  }

  useEffect(() => {
    return () => {
      cancelActiveWork();
    };
  }, []);

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

  async function ask(text: string, language = "en") {
    const question = text.trim();

    if (
      !question ||
      status === "processing" ||
      status === "speaking"
    ) {
      return;
    }

    const epoch = chatEpochRef.current;
    const request = beginRequest();
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
      const response = await askQuestion(
        question,
        sessionId,
        language,
        request.signal,
      );

      if (epoch !== chatEpochRef.current) {
        return;
      }

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
                card: response.card,
              }
            : message,
        ),
      );

      if (response.audio_base64 && epoch === chatEpochRef.current) {
        await playBase64Audio(
          response.audio_base64,
          assistantMessageId,
        );
      }

      if (epoch === chatEpochRef.current) {
        setStatus("idle");
      }
    } catch (error) {
      if (epoch !== chatEpochRef.current || isAbortError(error)) {
        return;
      }
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

    const attempt = ++welcomeAttemptRef.current;
    const request = beginRequest();
    welcomeStartedRef.current = true;
    setError(null);
    setStatus("processing");

    try {
      const audioBase64 = await synthesizeSpeech(
        WELCOME_MESSAGE.content,
        request.signal,
      );
      if (welcomeAttemptRef.current !== attempt) {
        return;
      }

      markWelcomeSpoken();

      if (audioBase64) {
        setMessages((current) =>
          current.map((message) =>
            message.id === "welcome" ? { ...message, audioBase64 } : message,
          ),
        );
        await playBase64Audio(audioBase64, "welcome");
      }

      if (welcomeAttemptRef.current === attempt) {
        setStatus("idle");
      }
    } catch (error) {
      if (
        welcomeAttemptRef.current !== attempt ||
        welcomeSpokenRef.current ||
        isAbortError(error)
      ) {
        return;
      }
      welcomeStartedRef.current = false;
      setStatus("idle");
      setError("Could not play the welcome message.");
    }
  }

  function markWelcomeSpoken() {
    welcomeSpokenRef.current = true;
    setWelcomeSpoken(true);
    setError(null);
  }

  function startNewChat() {
    cancelActiveWork();
    stopSpeaking();
    welcomeStartedRef.current = false;
    welcomeSpokenRef.current = false;
    setMessages([
      { ...WELCOME_MESSAGE, createdAt: new Date().toISOString() },
    ]);
    setSessionId(undefined);
    setError(null);
    setWelcomeSpoken(false);
    setStatus("welcome");
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
      if (message.id === "welcome") {
        setError(null);
      }
      void playBase64Audio(message.audioBase64, message.id);
      return;
    }

    if (message.id !== "welcome") {
      return;
    }

    void (async () => {
      const attempt = ++welcomeAttemptRef.current;
      const request = beginRequest();
      setError(null);
      setStatus("processing");
      try {
        const audioBase64 = await synthesizeSpeech(
          WELCOME_MESSAGE.content,
          request.signal,
        );
        if (welcomeAttemptRef.current !== attempt) {
          return;
        }
        if (!audioBase64) {
          setStatus("idle");
          return;
        }
        setMessages((current) =>
          current.map((item) =>
            item.id === "welcome" ? { ...item, audioBase64 } : item,
          ),
        );
        markWelcomeSpoken();
        welcomeStartedRef.current = true;
        await playBase64Audio(audioBase64, "welcome");
        if (welcomeAttemptRef.current === attempt) {
          setStatus("idle");
        }
      } catch (error) {
        if (
          welcomeAttemptRef.current !== attempt ||
          welcomeSpokenRef.current ||
          isAbortError(error)
        ) {
          return;
        }
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
    startNewChat,
    welcomeSpoken,
    playingMessageId,
    audioProgress,
    toggleMessagePlayback,
  };
}