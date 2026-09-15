import { useRef } from "react";

/**
 * Browser microphone capture backed by MediaRecorder.
 * start() opens the mic and begins recording; stop() ends it and resolves the captured audio.
 */
export function useMicrophone() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  async function start(): Promise<void> {
    if (!isSupported) {
      throw new Error("Microphone access is not supported in this browser");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorderRef.current = recorder;
    recorder.start();
  }

  function stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const recorder = recorderRef.current;
      if (!recorder) {
        reject(new Error("Recording was not started"));
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        resolve(blob);
      };
      recorder.stop();
    });
  }

  return { isSupported, start, stop };
}
