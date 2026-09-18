import { env } from "@/shared/config/env";

export type AudioPlayback = {
  finished: Promise<void>;
  stop: () => void;
};

function audioUrlFromBase64(audioBase64: string) {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

/** Decode base64 PCM/WAV audio from the ask response and play it in the browser. */
export function createAudioPlayback(audioBase64: string): AudioPlayback {
  const url = audioUrlFromBase64(audioBase64);
  const audio = new Audio(url);
  const savedVolume = Number(localStorage.getItem("tts-volume") ?? "1");
  audio.volume = Math.min(1, Math.max(0, savedVolume));
  let stop = () => {};
  let settled = false;

  const finished = new Promise<void>((resolve, reject) => {
    function cleanup() {
      URL.revokeObjectURL(url);
    }

    function finish() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }

    function fail(error: unknown) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error("Audio playback failed"));
    }

    audio.onended = finish;
    audio.onerror = () => fail(new Error("Audio playback failed"));
    stop = () => {
      audio.pause();
      audio.currentTime = 0;
      finish();
    };

    void audio.play().catch(fail);
  });

  return { finished, stop };
}

export async function synthesizeSpeech(text: string): Promise<string | null> {
  const response = await fetch(`${env.apiBaseUrl}/api/v1/conversation/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Speech synthesis failed: ${response.status}`);
  }

  const data = (await response.json()) as { audio_base64: string | null };
  return data.audio_base64;
}
