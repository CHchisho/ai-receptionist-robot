import { useState } from "react";
import { askQuestion } from "@/features/conversation/api";
import type {
  ChatLink,
  ChatMessage,
} from "@/features/conversation/types";
import { playAudio } from "@/features/voice/services/ttsClient";
import type { UiState } from "@/shared/types/ui";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello, I am Lena. Ask me about Nokia, the Innovation Garage, or how to find your way.",
  createdAt: new Date().toISOString(),
};

function createId() {
  return crypto.randomUUID();
}

export function useConversation() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    WELCOME_MESSAGE,
  ]);
  const [status, setStatus] = useState<UiState>("welcome");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  async function ask(text: string) {
    const question = text.trim();

    if (!question || status === "processing") {
      return;
    }

    setError(null);
    setStatus("processing");

    setMessages((current) => [
      ...current,
      {
        id: createId(),
        role: "user",
        content: question,
        createdAt: new Date().toISOString(),
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

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: response.answer,
          createdAt: new Date().toISOString(),
          links: temporaryLinks,
          audioBase64: response.audio_base64,
        },
      ]);

      if (response.audio_base64) {
        setStatus("speaking");

        try {
          await playAudio(response.audio_base64);
        } catch {
          // Playback issues should not block the conversation.
        }
      }

      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Could not get an answer. Please try again.");
    }
  }

  return {
    messages,
    status,
    error,
    ask,
  };
}