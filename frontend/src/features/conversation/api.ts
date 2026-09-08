import { http } from "@/shared/api/http";
import type { AskResponse } from "@/features/conversation/types";

export function askQuestion(text: string, sessionId?: string) {
  return http<AskResponse>("/api/v1/conversation/ask", {
    method: "POST",
    body: JSON.stringify({ text, session_id: sessionId ?? null }),
  });
}
