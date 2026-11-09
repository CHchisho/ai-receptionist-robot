import { env } from "@/shared/config/env";

export type AudioPlayback = {
  finished: Promise<boolean>;
  stop: () => void;
  onProgress?: (callback: (progress: number) => void) => () => void;
};

const VOLUME_KEY = "tts-volume";
const MAX_VOLUME = 2;

let activeAudioStop: (() => void) | null = null;
let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
let ttsVolume = readStoredVolume();

function clampVolume(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(MAX_VOLUME, Math.max(0, value));
}

function readStoredVolume() {
  const saved = Number(localStorage.getItem(VOLUME_KEY) ?? "1");
  return clampVolume(saved);
}

function ensureGain() {
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioContext = new Ctor();
  }
  if (!gainNode) {
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
  }
  gainNode.gain.value = ttsVolume;
  return { context: audioContext, gain: gainNode };
}

// iOS Safari only lets an AudioContext start inside a user gesture. Once it is
// running, buffers can be played at any time, so this must be called
// synchronously from a tap handler (e.g. the microphone button).
export function unlockAudio() {
  const { context } = ensureGain();
  if (context.state !== "running") {
    void context.resume();
  }
  const silent = context.createBufferSource();
  silent.buffer = context.createBuffer(1, 1, 22050);
  silent.connect(context.destination);
  silent.start(0);
}

function unlockOnGesture() {
  if (audioContext?.state === "running") {
    return;
  }
  unlockAudio();
}

for (const eventName of ["touchend", "click", "keydown"]) {
  document.addEventListener(eventName, unlockOnGesture, { passive: true });
}

export function getTtsVolume() {
  return ttsVolume;
}

export function setTtsVolume(volume: number) {
  ttsVolume = clampVolume(volume);
  localStorage.setItem(VOLUME_KEY, String(ttsVolume));
  if (gainNode) {
    gainNode.gain.value = ttsVolume;
  }
}

export function stopActiveAudio() {
  activeAudioStop?.();
  activeAudioStop = null;
}

function bytesFromBase64(audioBase64: string) {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

export function createAudioPlayback(audioBase64: string): AudioPlayback {
  stopActiveAudio();

  const { context, gain } = ensureGain();
  const progressListeners = new Set<(progress: number) => void>();
  let source: AudioBufferSourceNode | null = null;
  let settled = false;
  let progressFrame = 0;
  let resolveFinished: (completed: boolean) => void = () => {};
  let rejectFinished: (error: Error) => void = () => {};

  const finished = new Promise<boolean>((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });

  function notifyProgress(progress: number) {
    progressListeners.forEach((callback) => {
      callback(progress);
    });
  }

  function cleanup() {
    cancelAnimationFrame(progressFrame);
    progressListeners.clear();
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Source may not have started yet.
      }
      source.disconnect();
      source = null;
    }
    if (activeAudioStop === stop) {
      activeAudioStop = null;
    }
  }

  function finish(completed: boolean) {
    if (settled) return;
    settled = true;
    if (completed) {
      notifyProgress(100);
    }
    cleanup();
    resolveFinished(completed);
  }

  function fail(error: unknown) {
    if (settled) return;
    settled = true;
    cleanup();
    rejectFinished(
      error instanceof Error ? error : new Error("Audio playback failed"),
    );
  }

  function stop() {
    finish(false);
  }

  activeAudioStop = stop;

  void (async () => {
    try {
      if (context.state !== "running") {
        await context.resume();
      }
      const buffer = await context.decodeAudioData(
        bytesFromBase64(audioBase64),
      );
      if (settled) return;

      const node = context.createBufferSource();
      node.buffer = buffer;
      node.connect(gain);
      node.onended = () => finish(true);
      source = node;

      const startedAt = context.currentTime;
      node.start(0);

      const trackProgress = () => {
        if (settled) return;
        const elapsed = context.currentTime - startedAt;
        notifyProgress(Math.min((elapsed / buffer.duration) * 100, 100));
        progressFrame = requestAnimationFrame(trackProgress);
      };
      progressFrame = requestAnimationFrame(trackProgress);
    } catch (error) {
      fail(error);
    }
  })();

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

const welcomeAudioByText = new Map<string, Promise<string | null>>();

export type PreparedWelcome = {
  text: string;
  audioBase64: string | null;
};

/** Opening line saved in admin, including the clip prepared at startup. */
export async function fetchPreparedWelcome(): Promise<PreparedWelcome> {
  const response = await fetch(`${env.apiBaseUrl}/api/v1/kiosk/welcome`);
  if (!response.ok) {
    throw new Error(`Welcome message failed: ${response.status}`);
  }
  const data = (await response.json()) as {
    text: string;
    audio_base64: string | null;
  };
  return {
    text: data.text,
    audioBase64: data.audio_base64,
  };
}

/** One request per wording, shared by a tap that arrives before playback is ready. */
export function loadWelcomeSpeech(text: string): Promise<string | null> {
  const pending = welcomeAudioByText.get(text);
  if (pending) {
    return pending;
  }
  const request = synthesizeSpeech(text).catch((error: unknown) => {
    welcomeAudioByText.delete(text);
    throw error;
  });
  welcomeAudioByText.set(text, request);
  return request;
}

export async function synthesizeSpeech(
  text: string,
  signal?: AbortSignal,
  turnId?: number,
  language = "en",
): Promise<string | null> {
  const response = await fetch(`${env.apiBaseUrl}/api/v1/conversation/speak`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      language,
      turn_id: turnId ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Speech synthesis failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    audio_base64: string | null;
  };

  return data.audio_base64;
}
