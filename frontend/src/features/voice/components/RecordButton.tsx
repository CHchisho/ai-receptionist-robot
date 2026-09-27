import { useState } from "react";
import { useMicrophone } from "@/features/voice/hooks/useMicrophone";
import { transcribeAudio } from "@/features/voice/services/sttClient";
import styles from "./RecordButton.module.css";

type Props = {
  disabled?: boolean;
  onTranscribed: (text: string) => void;
  onEmptyTranscription?: () => void;
  onStateChange?: (state: RecordingState) => void;
};

type RecordingState = "idle" | "recording" | "processing";

export function RecordButton({ disabled, onTranscribed, onEmptyTranscription, onStateChange }: Props) {
  const { isSupported, start, stop } = useMicrophone();
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);

  function updateState(nextState: RecordingState) {
    setState(nextState);
    onStateChange?.(nextState);
  }

  async function handleClick() {
    if (disabled || state === "processing") {
      return;
    }

    if (state === "idle") {
      setError(null);
      try {
        await start();
        updateState("recording");
      } catch {
        setError("Could not access the microphone.");
      }
      return;
    }

    updateState("processing");
    try {
      const audio = await stop();
      const text = await transcribeAudio(audio);
      const recognisedText = text.trim();
      if (!recognisedText) {
        onEmptyTranscription?.();
        return;
      }
      onTranscribed(recognisedText);
    } catch {
      setError("Could not transcribe the recording. Please try again.");
    } finally {
      updateState("idle");
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
        <span className={styles.pulse} aria-hidden="true" />
        <span className={styles.icon} aria-hidden="true" />
      </button>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
