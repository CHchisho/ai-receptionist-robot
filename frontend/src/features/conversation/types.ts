export type MessageRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
};

export type AskResponse = {
  session_id: string;
  answer: string;
  links: { url: string; label: string }[];
  sources: { source_id: string; title: string; snippet: string }[];
};
