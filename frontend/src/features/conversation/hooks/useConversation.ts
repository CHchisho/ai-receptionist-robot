import { useEffect, useRef, useState } from "react";
import { askQuestion } from "@/features/conversation/api";
import type { ChatLink, ChatMessage } from "@/features/conversation/types";
import { splitSentences } from "@/features/voice/splitSentences";
import {
  createAudioPlayback,
  fetchPreparedWelcome,
  loadWelcomeSpeech,
  synthesizeSpeech,
  type AudioPlayback,
} from "@/features/voice/services/ttsClient";
import type { UiState } from "@/shared/types/ui";

type WelcomeClip = {
  content: string;
  audioBase64: string | null;
};

function welcomeMessage(
  clip: WelcomeClip,
  createdAt = new Date().toISOString(),
): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: clip.content,
    createdAt,
    pending: clip.content.length === 0,
    ...(clip.audioBase64 ? { audioBase64: clip.audioBase64 } : {}),
  };
}

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

type SpeechSegment = {
  index: number;
  total: number;
};

function overallProgress(segment: SpeechSegment, clipProgress: number) {
  if (segment.total <= 1) {
    return clipProgress;
  }
  const share = Math.min(Math.max(clipProgress, 0), 100) / 100;
  return ((segment.index + share) / segment.total) * 100;
}

export function useConversation() {
  const welcomeClipRef = useRef<WelcomeClip>({
    content: "",
    audioBase64: null,
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    welcomeMessage(welcomeClipRef.current),
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

  useEffect(() => {
    let cancelled = false;
    void fetchPreparedWelcome()
      .then((welcome) => {
        if (cancelled) {
          return;
        }
        welcomeClipRef.current = {
          content: welcome.text,
          audioBase64: welcome.audioBase64,
        };
        setMessages((current) =>
          current.map((message) =>
            message.id === "welcome"
              ? welcomeMessage(welcomeClipRef.current, message.createdAt)
              : message,
          ),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load the welcome message.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function playBase64Audio(
    audioBase64: string,
    messageId?: string,
    release = true,
    segment?: SpeechSegment,
  ) {
    playbackRef.current?.stop();

    setStatus("speaking");

    if (messageId) {
      setPlayingMessageId(messageId);
      if (!segment || segment.index === 0) {
        setAudioProgress(0);
      }
    }

    const playback = createAudioPlayback(audioBase64);
    playbackRef.current = playback;

    const removeProgressListener = playback.onProgress?.(
      (progress) => {
        if (messageId) {
          setAudioProgress(segment ? overallProgress(segment, progress) : progress);
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
    }

    if (playbackRef.current !== playback) {
      return false;
    }

    playbackRef.current = null;

    if (!release) {
      if (completed && segment) {
        setAudioProgress(overallProgress(segment, 100));
      }
      return completed;
    }

    if (completed && messageId) {
      setAudioProgress(100);
      await waitForNextPaint();

      if (playbackRef.current !== null) {
        return false;
      }
    }

    if (messageId) {
      setPlayingMessageId((current) => (current === messageId ? null : current));
      setAudioProgress(0);
    }
    setStatus((current) => (current === "speaking" ? "idle" : current));
    return completed;
  }

  async function playClips(clips: string[], messageId?: string) {
    const playable = clips.filter(Boolean);
    for (let index = 0; index < playable.length; index += 1) {
      const finished = await playBase64Audio(
        playable[index],
        messageId,
        index === playable.length - 1,
        { index, total: playable.length },
      );
      if (!finished) {
        return;
      }
    }
  }

  async function ask(text: string, language = "en", sttMs?: number) {
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
    let answerShown = false;
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
        sttMs,
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
                reveal: true,
                ttsPending: true,
                links: temporaryLinks,
                route: response.route,
                card: response.card,
              }
            : message,
        ),
      );
      answerShown = true;

      const sentences = splitSentences(response.answer);
      const clips: string[] = [];
      let upcoming: Promise<string | null> | null = sentences[0]
        ? synthesizeSpeech(
            sentences[0],
            request.signal,
            response.turn_id ?? undefined,
            language,
          )
        : null;

      for (let index = 0; index < sentences.length; index += 1) {
        if (!upcoming) {
          break;
        }
        const audio = await upcoming;
        upcoming = null;
        if (epoch !== chatEpochRef.current) {
          return;
        }

        const nextSentence = sentences[index + 1];
        if (nextSentence) {
          upcoming = synthesizeSpeech(
            nextSentence,
            request.signal,
            response.turn_id ?? undefined,
            language,
          );
        }

        if (!audio) {
          setAudioProgress(overallProgress({ index, total: sentences.length }, 100));
          continue;
        }

        clips.push(audio);
        const ready = [...clips];
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId
              ? { ...message, ttsPending: false, audioClips: ready, audioBase64: ready[0] }
              : message,
          ),
        );
        const finished = await playBase64Audio(
          audio,
          assistantMessageId,
          !nextSentence,
          { index, total: sentences.length },
        );
        if (!finished || epoch !== chatEpochRef.current) {
          upcoming?.catch(() => undefined);
          if (epoch === chatEpochRef.current) {
            finishSpeechUi(assistantMessageId);
          }
          return;
        }
      }

      upcoming?.catch(() => undefined);

      if (clips.length === 0 && epoch === chatEpochRef.current) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId ? { ...message, ttsPending: false } : message,
          ),
        );
      }

      if (epoch === chatEpochRef.current) {
        finishSpeechUi(assistantMessageId);
      }
    } catch (error) {
      if (epoch !== chatEpochRef.current || isAbortError(error)) {
        return;
      }
      setMessages((current) =>
        current.flatMap((message) => {
          if (message.id !== assistantMessageId) {
            return [message];
          }
          if (message.pending || !message.content) {
            return [];
          }
          return [{ ...message, ttsPending: false }];
        }),
      );
      if (playbackRef.current === null) {
        setPlayingMessageId((current) => (current === assistantMessageId ? null : current));
        setAudioProgress(0);
      }
      setStatus("error");
      setError(
        answerShown
          ? "Could not play the answer."
          : "Could not get an answer. Please try again.",
      );
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
    beginRequest();
    welcomeStartedRef.current = true;
    setError(null);
    setStatus("processing");

    const welcomeText = welcomeClipRef.current.content;
    if (!welcomeText) {
      welcomeStartedRef.current = false;
      setStatus("idle");
      return;
    }

    try {
      const audioBase64 = await loadWelcomeSpeech(welcomeText);
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
    setMessages([welcomeMessage(welcomeClipRef.current)]);
    setSessionId(undefined);
    setError(null);
    setWelcomeSpoken(false);
    setStatus("welcome");
  }

  function finishSpeechUi(messageId: string) {
    if (playbackRef.current) {
      return;
    }
    setPlayingMessageId((current) => (current === messageId ? null : current));
    setAudioProgress(0);
    setStatus((current) =>
      current === "speaking" || current === "processing" ? "idle" : current,
    );
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

    const clips = message.audioClips?.length
      ? message.audioClips
      : message.audioBase64
        ? [message.audioBase64]
        : [];
    if (clips.length > 0) {
      if (message.id === "welcome") {
        setError(null);
      }
      void playClips(clips, message.id);
      return;
    }

    if (message.id !== "welcome") {
      return;
    }

    void (async () => {
      const attempt = ++welcomeAttemptRef.current;
      beginRequest();
      setError(null);
      setStatus("processing");
      try {
        const welcomeText = welcomeClipRef.current.content;
        if (!welcomeText) {
          setStatus("idle");
          return;
        }
        const audioBase64 = await loadWelcomeSpeech(welcomeText);
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