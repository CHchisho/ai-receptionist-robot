import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import styles from "./PresencePrompt.module.css";

type Props = {
  active: boolean;
  resetKey: string;
  idleMs: number;
  confirmMs: number;
  onTimeout: () => void;
};

export function PresencePrompt({
  active,
  resetKey,
  idleMs,
  confirmMs,
  onTimeout,
}: Props) {
  const [open, setOpen] = useState(false);
  const onTimeoutRef = useRef(onTimeout);
  const sessionRef = useRef(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    sessionRef.current += 1;
    setOpen(false);
  }, [resetKey]);

  useEffect(() => {
    if (!active || open) {
      return;
    }
    const id = window.setTimeout(() => setOpen(true), idleMs);
    return () => window.clearTimeout(id);
  }, [active, open, idleMs, resetKey]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const token = sessionRef.current;
    buttonRef.current?.focus();
    const id = window.setTimeout(() => {
      if (sessionRef.current !== token) {
        return;
      }
      setOpen(false);
      onTimeoutRef.current();
    }, confirmMs);
    return () => window.clearTimeout(id);
  }, [open, confirmMs]);

  function stay(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    sessionRef.current += 1;
    setOpen(false);
  }

  if (!open) {
    return null;
  }

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="presence-title"
      >
        <h2 id="presence-title" className={styles.question}>
          Are you still there?
        </h2>
        <button ref={buttonRef} className={styles.stay} type="button" onClick={stay}>
          Yes
        </button>

      </div>
    </div>,
    document.body,
  );
}
