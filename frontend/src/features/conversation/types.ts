export type MessageRole = "user" | "assistant";

export type ChatLink = {
  url: string;
  label: string;
};

export type NavigationRoute = {
  name: string;
  floor: string;
  landmark: string;
  directions: string;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  links?: ChatLink[];
  audioBase64?: string | null;
  route?: NavigationRoute | null;
};

export type AskResponse = {
  session_id: string;
  answer: string;
  audio_base64: string | null;
  links: ChatLink[];
  sources: { source_id: string; title: string; snippet: string }[];
  route: NavigationRoute | null;
};