import { http } from "@/shared/api/http";

export type HistorySession = {
  session_id: string;
  started_at: string;
  updated_at: string;
  turn_count: number;
  last_question: string | null;
};

export type HistoryTurn = {
  id: number;
  session_id: string;
  question: string;
  answer: string;
  retrieved: {
    source_id: string;
    title: string;
    snippet: string;
    url?: string | null;
  }[];
  system_prompt: string;
  user_prompt: string;
  created_at: string;
};

export function listSessions() {
  return http<HistorySession[]>("/api/v1/history/sessions");
}

export function getSession(sessionId: string) {
  return http<{ session_id: string; turns: HistoryTurn[] }>(
    `/api/v1/history/sessions/${encodeURIComponent(sessionId)}`,
  );
}

export function deleteSession(sessionId: string) {
  return http<{ ok: boolean }>(
    `/api/v1/history/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  );
}
