import { useRef, useState } from "react";
import { IconVolumeHigh, IconVolumeOff } from "@/shared/icons";
import { getTtsVolume, setTtsVolume } from "@/features/voice/services/ttsClient";
import styles from "./VolumeControl.module.css";

export function VolumeControl() {
  const [volume, setVolume] = useState(getTtsVolume);
  const lastAudible = useRef(volume > 0 ? volume : 1);

  function applyVolume(next: number) {
    const value = Math.min(2, Math.max(0, next));
    if (value > 0) {
      lastAudible.current = value;
    }
    setVolume(value);
    setTtsVolume(value);
  }

  return (
    <div className={styles.control}>
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => applyVolume(volume === 0 ? lastAudible.current : 0)}
        aria-label={volume === 0 ? "Unmute" : "Mute"}
      >
        <IconVolumeOff className={styles.icon} />
      </button>
      <input
        className={styles.slider}
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={volume}
        onChange={(event) => applyVolume(Number(event.target.value))}
        aria-label="Voice volume"
      />
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => applyVolume(2)}
        aria-label="Boost volume"
      >
        <IconVolumeHigh className={styles.icon} />
      </button>
    </div>
  );
}
