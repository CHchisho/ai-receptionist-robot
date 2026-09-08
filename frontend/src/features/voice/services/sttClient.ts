import { env } from "@/shared/config/env";

/** Upload recorded audio to the backend and get back the recognised text. */
export async function transcribeAudio(audio: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", audio, "recording.webm");

  const response = await fetch(`${env.apiBaseUrl}/api/v1/conversation/transcribe`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.status}`);
  }

  const data = (await response.json()) as { text: string };
  return data.text;
}
