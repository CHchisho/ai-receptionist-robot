function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  chatIdleSeconds: positiveNumber(import.meta.env.VITE_CHAT_IDLE_SECONDS, 60),
};
