import { env } from "@/shared/config/env";

export type TranscriptionResult = {
  text: string;
  language: string;
};

/** Upload recorded audio to the backend and get recognised text + language. */
export async function transcribeAudio(
  audio: Blob,
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append("file", audio, "recording.webm");

  const response = await fetch(
    `${env.apiBaseUrl}/api/v1/conversation/transcribe`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.status}`);
  }

  return (await response.json()) as TranscriptionResult;
}