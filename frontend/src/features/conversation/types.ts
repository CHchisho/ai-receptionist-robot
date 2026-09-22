export type MessageRole = "user" | "assistant";

export type ChatLink = {
  url: string;
  label: string;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  links?: ChatLink[];
  audioBase64?: string | null;
  card?: ContentCard | null;
};

export type ContentCard = {
  kind: "demo" | "event";
  title: string;
  description: string;
  location?: string | null;
  event_time?: string | null;
  room?: string | null;
  url?: string | null;
};

export type AskResponse = {
  session_id: string;
  answer: string;
  audio_base64: string | null;
  links: ChatLink[];
  sources: { source_id: string; title: string; snippet: string }[];
  card: ContentCard | null;
};