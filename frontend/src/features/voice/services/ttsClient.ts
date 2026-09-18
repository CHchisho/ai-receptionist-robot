import { env } from "@/shared/config/env";

export type AudioPlayback = {
  finished: Promise<void>;
  stop: () => void;
  onProgress?: (callback: (progress: number) => void) => () => void;
};

let activeAudioStop: (() => void) | null = null;

export function stopActiveAudio() {
  activeAudioStop?.();
  activeAudioStop = null;
}

function audioUrlFromBase64(audioBase64: string) {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

/** Create an audio element for replaying audio in the browser. */
export function createAudio(audioBase64: string): HTMLAudioElement {
  const url = audioUrlFromBase64(audioBase64);
  const audio = new Audio(url);

  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
    URL.revokeObjectURL(url);

    if (activeAudioStop === stop) {
      activeAudioStop = null;
    }
  };

  stopActiveAudio();
  activeAudioStop = stop;

  audio.addEventListener("ended", () => {
    URL.revokeObjectURL(url);

    if (activeAudioStop === stop) {
      activeAudioStop = null;
    }
  });

  return audio;
}

/** Play audio from a base64 WAV response. */
export async function playAudio(audioBase64: string): Promise<void> {
  const audio = createAudio(audioBase64);
  await audio.play();
}

/** Decode base64 audio and manage its playback. */
export function createAudioPlayback(
  audioBase64: string,
): AudioPlayback {
  const url = audioUrlFromBase64(audioBase64);
  const audio = new Audio(url);
  const progressListeners = new Set<(progress: number) => void>();
  let stop = () => {};
  let settled = false;

  stopActiveAudio();

  const finished = new Promise<void>((resolve, reject) => {
    function cleanup() {
      URL.revokeObjectURL(url);
      progressListeners.clear();
    }

    function notifyProgress(progress: number) {
      progressListeners.forEach((callback) => {
        callback(progress);
      });
    }

    function finish() {
      if (settled) return;
      settled = true;
      notifyProgress(100);
      cleanup();
      resolve();
    }

    function fail(error: unknown) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        error instanceof Error
          ? error
          : new Error("Audio playback failed"),
      );
    }

    audio.ontimeupdate = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        const progress =
          (audio.currentTime / audio.duration) * 100;

        notifyProgress(Math.min(progress, 100));
      }
    };

    audio.onended = finish;
    audio.onerror = () =>
      fail(new Error("Audio playback failed"));

    stop = () => {
      audio.pause();
      audio.currentTime = 0;
      finish();
    };

    activeAudioStop = stop;

    void audio.play().catch(fail);
  });

  return {
    finished,
    stop,
    onProgress: (callback) => {
      progressListeners.add(callback);

      return () => {
        progressListeners.delete(callback);
      };
    },
  };
}

export async function synthesizeSpeech(
  text: string,
): Promise<string | null> {
  const response = await fetch(
    `${env.apiBaseUrl}/api/v1/conversation/speak`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Speech synthesis failed: ${response.status}`,
    );
  }

  const data = (await response.json()) as {
    audio_base64: string | null;
  };

  return data.audio_base64;
}