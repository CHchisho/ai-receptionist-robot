import { QRCode } from "./QRCode";
import styles from "./QRPopup.module.css";

type Props = {
  url: string;
  onClose: () => void;
};

export function QRPopup({ url, onClose }: Props) {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="QR code"
      onClick={onClose}
    >
      <div
        className={styles.popup}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className={styles.close}
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <QRCode url={url} />
      </div>
    </div>
  );
}
