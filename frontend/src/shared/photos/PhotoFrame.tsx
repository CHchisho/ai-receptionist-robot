import { useState } from "react";
import { IconTrash } from "@/shared/icons";
import { mediaSrc } from "@/features/content/api";
import styles from "./photos.module.css";

type Props = {
  url: string;
  disabled?: boolean;
  onRemove: () => void;
};

export function PhotoFrame({ url, disabled = false, onRemove }: Props) {
  const [confirming, setConfirming] = useState(false);
  const src = mediaSrc(url);
  if (!src) {
    return null;
  }

  return (
    <div className={styles.frame}>
      <img className={styles.thumb} src={src} alt="" />
      <button
        type="button"
        className={styles.remove}
        disabled={disabled}
        aria-label="Remove photo"
        onClick={() => setConfirming(true)}
      >
        <IconTrash className={styles.removeIcon} />
        <span className={styles.tip}>Remove photo</span>
      </button>
      {confirming ? (
        <div className={styles.confirm}>
          <p>Remove this photo?</p>
          <div className={styles.confirmActions}>
            <button
              type="button"
              className={styles.danger}
              disabled={disabled}
              onClick={() => {
                setConfirming(false);
                onRemove();
              }}
            >
              Remove
            </button>
            <button type="button" className={styles.ghost} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
