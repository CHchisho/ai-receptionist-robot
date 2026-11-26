import { useRef } from "react";

/** Trailing silence after the visitor has started speaking. */
const SILENCE_MS = 3000;
/** Ignore the level right after the button press, before the visitor speaks. */
const ARM_MS = 700;
const POLL_MS = 100;
const MIN_SPEECH_RMS = 0.02;

/**
 * Browser microphone capture backed by MediaRecorder.
 * start() opens the mic and begins recording; stop() ends it and resolves the captured audio.
 * After speech is heard, onSilence fires once SILENCE_MS of quiet passes.
 */
export function useMicrophone() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const pollRef = useRef<number | null>(null);

  const isSupported = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  function clearMonitor() {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close();
    }
  }

  async function start(onSilence?: () => void): Promise<void> {
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

    if (!onSilence) {
      return;
    }

    const context = new AudioContext();
    audioContextRef.current = context;
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);

    let elapsed = 0;
    let noiseSum = 0;
    let noiseSamples = 0;
    let heardSpeech = false;
    let silentFor = 0;
    let fired = false;
    let speechRms = MIN_SPEECH_RMS;

    pollRef.current = window.setInterval(() => {
      if (fired || recorderRef.current !== recorder) {
        return;
      }

      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (let index = 0; index < samples.length; index += 1) {
        const value = (samples[index] - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / samples.length);
      elapsed += POLL_MS;

      if (elapsed <= ARM_MS) {
        noiseSum += rms;
        noiseSamples += 1;
        speechRms = Math.max(MIN_SPEECH_RMS, (noiseSum / noiseSamples) * 2.8);
        return;
      }

      if (rms >= speechRms) {
        heardSpeech = true;
        silentFor = 0;
        return;
      }

      if (!heardSpeech) {
        return;
      }

      silentFor += POLL_MS;
      if (silentFor >= SILENCE_MS) {
        fired = true;
        onSilence();
      }
    }, POLL_MS);
  }

  function stop(): Promise<Blob> {
    clearMonitor();

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
