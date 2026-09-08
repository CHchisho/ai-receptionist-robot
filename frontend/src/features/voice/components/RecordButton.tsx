import { useState } from "react";
import { useMicrophone } from "@/features/voice/hooks/useMicrophone";
import { transcribeAudio } from "@/features/voice/services/sttClient";
import styles from "./RecordButton.module.css";

type Props = {
  disabled?: boolean;
  onTranscribed: (text: string) => void;
};

type RecordingState = "idle" | "recording" | "processing";

export function RecordButton({ disabled, onTranscribed }: Props) {
  const { isSupported, start, stop } = useMicrophone();
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (disabled || state === "processing") {
      return;
    }

    if (state === "idle") {
      setError(null);
      try {
        await start();
        setState("recording");
      } catch {
        setError("Could not access the microphone.");
      }
      return;
    }

    setState("processing");
    try {
      const audio = await stop();
      const text = await transcribeAudio(audio);
      onTranscribed(text);
    } catch {
      setError("Could not transcribe the recording. Please try again.");
    } finally {
      setState("idle");
    }
  }

  if (!isSupported) {
    return null;
  }

  const isRecording = state === "recording";

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={isRecording ? `${styles.button} ${styles.recording}` : styles.button}
        onClick={handleClick}
        disabled={disabled || state === "processing"}
        aria-pressed={isRecording}
        aria-label={isRecording ? "Stop recording" : "Start voice recording"}
      >
        <span className={styles.icon} aria-hidden="true" />
      </button>
      <p className={styles.hint}>
        {isRecording ? "Recording… tap to stop" : state === "processing" ? "Transcribing…" : "Tap to speak"}
      </p>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
