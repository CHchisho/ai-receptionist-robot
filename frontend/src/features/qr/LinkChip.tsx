import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { QRCode } from "@/features/qr/QRCode";
import { IconLink, IconQrCode } from "@/shared/icons";
import styles from "./LinkChip.module.css";

type Props = {
  url: string;
  label: string;
};

export function LinkChip({ url, label }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({});
  const popupId = useId();

  function toggle(event: React.MouseEvent) {
    event.stopPropagation();
    setOpen((current) => !current);
  }

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      return;
    }

    const anchor = buttonRef.current.getBoundingClientRect();
    const popup = popupRef.current?.getBoundingClientRect();
    const width = popup?.width || Math.min(296, window.innerWidth - 24);
    const height = popup?.height || 260;
    const gap = 10;

    let left = anchor.left;
    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - 12 - width;
    }
    if (left < 12) {
      left = 12;
    }

    let top = anchor.top - height - gap;
    if (top < 12) {
      top = anchor.bottom + gap;
    }

    setPopupStyle({ top, left, width });
  }, [open, url]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || popupRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        className={styles.chip}
        type="button"
        aria-expanded={open}
        aria-controls={popupId}
        onClick={toggle}
      >
        <IconLink className={styles.icon} />
        <span className={styles.label}>{label}</span>
      </button>
      {open
        ? createPortal(
          <div
            ref={popupRef}
            id={popupId}
            className={styles.popup}
            style={popupStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <QRCode url={url} />
            <p className={styles.url}>{url}</p>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
