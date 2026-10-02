/**
 * Blocks ways to leave the kiosk page.
 *
 * Blocks:
 *  - context menu (long press → "Search Google", "Open in new tab")
 *  - text selection (also handled in CSS; this is an extra JS barrier)
 *  - clicks on external links (http/https/mailto/…); in-app SPA routes stay allowed
 *  - dragging text and links (drop into the address bar)
 *  - leaving the page via the address bar or a browser gesture (beforeunload)
 */
import { useEffect } from "react";

export function useKioskLock() {
  useEffect(() => {
    function handleContextMenu(e: MouseEvent) {
      e.preventDefault();
    }

    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Allow in-app SPA routes (/admin, /, #fragment)
      if (href.startsWith("/") || href.startsWith("#")) return;

      e.preventDefault();
      e.stopPropagation();
    }

    function handleDragStart(e: DragEvent) {
      e.preventDefault();
    }

    // Extra barrier if the visitor tries to leave via the address bar or reload.
    // On the tablet the main lock is still the OS kiosk mode.
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("dragstart", handleDragStart);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}
