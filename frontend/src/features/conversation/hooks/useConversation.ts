import { useRef, useState } from "react";
import { askQuestion } from "@/features/conversation/api";
import type { ChatMessage } from "@/features/conversation/types";
import { createAudioPlayback, synthesizeSpeech, type AudioPlayback } from "@/features/voice/services/ttsClient";
import type { UiState } from "@/shared/types/ui";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello, I am Lena. Ask me about Nokia, the Innovation Garage, or how to find your way.",
};

function createId() {
  return crypto.randomUUID();
}

export function useConversation() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [links, setLinks] = useState<{ url: string; label: string }[]>([]);
  const [status, setStatus] = useState<UiState>("welcome");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [welcomeSpoken, setWelcomeSpoken] = useState(false);
  const playbackRef = useRef<AudioPlayback | null>(null);
  const welcomeStartedRef = useRef(false);

  async function playBase64Audio(audioBase64: string) {
    setStatus("speaking");
    const playback = createAudioPlayback(audioBase64);
    playbackRef.current = playback;

    try {
      await playback.finished;
    } catch {
      // Playback issues shouldn't block the conversation from continuing.
    } finally {
      if (playbackRef.current === playback) {
        playbackRef.current = null;
      }
    }
  }

  async function ask(text: string) {
    const question = text.trim();
    if (!question || status === "processing" || status === "speaking") {
      return;
    }

    setError(null);
    setStatus("processing");
    setMessages((current) => [
      ...current,
      { id: createId(), role: "user", content: question },
    ]);

    try {
      const response = await askQuestion(question, sessionId);
      setSessionId(response.session_id);
      setLinks(response.links);

      setMessages((current) => [
        ...current,
        { id: createId(), role: "assistant", content: response.answer },
      ]);

      if (response.audio_base64) {
        await playBase64Audio(response.audio_base64);
      }

      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Could not get an answer. Please try again.");
    }
  }

  async function speakWelcomeOnce() {
    if (welcomeStartedRef.current || welcomeSpoken || status === "processing" || status === "speaking") {
      return;
    }

    welcomeStartedRef.current = true;
    setError(null);
    setStatus("processing");

    try {
      const audioBase64 = await synthesizeSpeech(WELCOME_MESSAGE.content);
      setWelcomeSpoken(true);
      if (audioBase64) {
        await playBase64Audio(audioBase64);
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
    setStatus("idle");
  }

  return {
    messages,
    links,
    status,
    error,
    ask,
    sessionId,
    stopSpeaking,
    speakWelcomeOnce,
    welcomeSpoken,
  };
}