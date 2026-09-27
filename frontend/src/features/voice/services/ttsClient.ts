import { env } from "@/shared/config/env";

export type AudioPlayback = {
  finished: Promise<boolean>;
  stop: () => void;
  onProgress?: (callback: (progress: number) => void) => () => void;
};

const VOLUME_KEY = "tts-volume";
const MAX_VOLUME = 2;

let activeAudioStop: (() => void) | null = null;
let activeAudioElement: HTMLAudioElement | null = null;
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
    audioContext = new AudioContext();
  }
  if (!gainNode) {
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
  }
  gainNode.gain.value = ttsVolume;
  return { context: audioContext, gain: gainNode };
}

function routeAudio(audio: HTMLAudioElement) {
  const { context, gain } = ensureGain();
  audio.volume = 1;
  if (!audio.dataset.routed) {
    context.createMediaElementSource(audio).connect(gain);
    audio.dataset.routed = "1";
  }
  void context.resume();
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
  if (activeAudioElement && !gainNode) {
    activeAudioElement.volume = Math.min(1, ttsVolume);
  }
}

export function stopActiveAudio() {
  activeAudioStop?.();
  activeAudioStop = null;
  activeAudioElement = null;
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

export function createAudio(audioBase64: string): HTMLAudioElement {
  const url = audioUrlFromBase64(audioBase64);
  const audio = new Audio(url);

  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
    URL.revokeObjectURL(url);

    if (activeAudioStop === stop) {
      activeAudioStop = null;
      activeAudioElement = null;
    }
  };

  stopActiveAudio();
  routeAudio(audio);
  activeAudioStop = stop;
  activeAudioElement = audio;

  audio.addEventListener("ended", () => {
    URL.revokeObjectURL(url);

    if (activeAudioStop === stop) {
      activeAudioStop = null;
      activeAudioElement = null;
    }
  });

  return audio;
}

export async function playAudio(audioBase64: string): Promise<void> {
  const audio = createAudio(audioBase64);
  await audio.play();
}

export function createAudioPlayback(audioBase64: string): AudioPlayback {
  const url = audioUrlFromBase64(audioBase64);
  const audio = new Audio(url);
  const progressListeners = new Set<(progress: number) => void>();
  let stop = () => {};
  let settled = false;
  let progressFrame = 0;

  stopActiveAudio();
  routeAudio(audio);
  activeAudioElement = audio;

  const finished = new Promise<boolean>((resolve, reject) => {
    function cleanup() {
      cancelAnimationFrame(progressFrame);
      URL.revokeObjectURL(url);
      progressListeners.clear();
      if (activeAudioElement === audio) {
        activeAudioElement = null;
      }
    }

    function notifyProgress(progress: number) {
      progressListeners.forEach((callback) => {
        callback(progress);
      });
    }

    function readProgress() {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        return;
      }

      notifyProgress(Math.min((audio.currentTime / audio.duration) * 100, 100));
    }

    function trackProgress() {
      readProgress();
      progressFrame = requestAnimationFrame(trackProgress);
    }

    function finish(completed: boolean) {
      if (settled) return;
      settled = true;
      if (completed) {
        notifyProgress(100);
      }
      cleanup();
      resolve(completed);
    }

    function fail(error: unknown) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error("Audio playback failed"));
    }

    audio.onended = () => finish(true);
    audio.onerror = () => fail(new Error("Audio playback failed"));

    stop = () => {
      audio.pause();
      audio.currentTime = 0;
      finish(false);
    };

    activeAudioStop = stop;
    progressFrame = requestAnimationFrame(trackProgress);

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

  const data = (await response.json()) as {
    audio_base64: string | null;
  };

  return data.audio_base64;
}
