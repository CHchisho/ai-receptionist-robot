/**
 * Blocks ways to leave the kiosk page. Only active when `enabled` is true
 * (the reception route). Admin keeps normal selection, menus, and links.
 *
 * Blocks:
 *  - context menu (long press → "Search Google", "Open in new tab")
 *  - text selection (CSS class `kiosk-lock` on <html>)
 *  - clicks on external links (http/https/mailto/…); in-app SPA routes stay allowed
 *  - dragging text and links (drop into the address bar)
 */
import { useEffect } from "react";

export function useKioskLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    root.classList.add("kiosk-lock");

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

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      root.classList.remove("kiosk-lock");
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, [enabled]);
}
