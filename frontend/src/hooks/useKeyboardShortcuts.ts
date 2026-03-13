/**
 * useKeyboardShortcuts — Global keyboard shortcut handler
 *
 * Listens for keydown events on document and dispatches to registered handlers.
 * Ignores events when focus is inside form elements or when modifier keys
 * (Ctrl/Cmd/Alt) are held — those belong to the browser.
 *
 * Uses event.code (not event.key) for consistent cross-platform behaviour.
 */
import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Shortcut map — single source of truth
// ---------------------------------------------------------------------------
export const SHORTCUTS = {
  'Space': 'capture',
  'KeyP': 'toggle-stream',
  'Digit1': 'region-full',
  'Digit2': 'region-face',
  'Digit3': 'region-body',
  'KeyF': 'fullscreen',
  'BracketLeft': 'sidebar',
  'Slash': 'help',
  'Escape': 'close',
} as const;

/** Union of all possible shortcut action strings */
export type ShortcutAction = (typeof SHORTCUTS)[keyof typeof SHORTCUTS];

/** All known key codes in the shortcut map */
type ShortcutCode = keyof typeof SHORTCUTS;

// Set of form-element tag names where shortcuts should be suppressed
const IGNORED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

// Codes that should preventDefault to avoid browser default behaviour
// (e.g. Space scrolling the page)
const PREVENT_DEFAULT_CODES = new Set<string>(['Space']);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Register global keyboard shortcuts.
 *
 * @param handlers - Partial map of ShortcutAction → callback.
 *   Only actions present in the map will fire; missing actions are silently
 *   ignored so you can register a subset of shortcuts per page.
 */
export function useKeyboardShortcuts(
  handlers: Partial<Record<ShortcutAction, () => void>>,
): void {
  // Store handlers in a ref so the keydown listener always sees the latest
  // callbacks without needing to re-register the event listener.
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // --- Guard: modifier keys (Ctrl / Cmd / Alt) → browser shortcut ---
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // --- Guard: focus inside a form element or contentEditable ---
      const target = event.target;
      if (target && target instanceof HTMLElement) {
        if (IGNORED_TAGS.has(target.tagName)) return;
        if (target.isContentEditable || target.contentEditable === 'true') return;
      }

      // --- Lookup ---
      const code = event.code as ShortcutCode;
      const action = SHORTCUTS[code] as ShortcutAction | undefined;
      if (!action) return;

      const handler = handlersRef.current[action];
      if (!handler) return;

      // Prevent default for codes that conflict with browser behaviour
      if (PREVENT_DEFAULT_CODES.has(code)) {
        event.preventDefault();
      }

      handler();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []); // empty deps — listener is stable, handlers accessed via ref
}
