import { useState } from "react";
import { askQuestion } from "@/features/conversation/api";
import type { ChatMessage } from "@/features/conversation/types";
import type { UiState } from "@/shared/types/ui";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hello, I am Lena. Ask me about Nokia, the Innovation Garage, or how to find your way.",
};

function createId() {
  return crypto.randomUUID();
}

export function useConversation() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
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
      { id: createId(), role: "user", content: question },
    ]);

    try {
      const response = await askQuestion(question, sessionId);
      setSessionId(response.session_id);
      setMessages((current) => [
        ...current,
        { id: createId(), role: "assistant", content: response.answer },
      ]);
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Could not get an answer. Please try again.");
    }
  }

  return { messages, status, error, ask };
}
