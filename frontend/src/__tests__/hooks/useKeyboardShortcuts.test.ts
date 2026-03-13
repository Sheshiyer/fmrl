import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, SHORTCUTS, type ShortcutAction } from '../../hooks/useKeyboardShortcuts';

/**
 * TDD Tests for useKeyboardShortcuts hook
 * RED phase — all tests written before implementation
 */

function fireKey(code: string, options: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', {
    code,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  document.dispatchEvent(event);
  return event;
}

function fireKeyOnElement(
  element: HTMLElement,
  code: string,
  options: Partial<KeyboardEventInit> = {},
) {
  const event = new KeyboardEvent('keydown', {
    code,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  element.dispatchEvent(event);
  return event;
}

describe('useKeyboardShortcuts', () => {
  let handlers: Partial<Record<ShortcutAction, () => void>>;

  beforeEach(() => {
    handlers = {
      'capture': vi.fn(),
      'toggle-stream': vi.fn(),
      'region-full': vi.fn(),
      'region-face': vi.fn(),
      'region-body': vi.fn(),
      'fullscreen': vi.fn(),
      'sidebar': vi.fn(),
      'help': vi.fn(),
      'close': vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SHORTCUTS map', () => {
    it('exports SHORTCUTS constant with all expected keys', () => {
      expect(SHORTCUTS).toBeDefined();
      expect(SHORTCUTS['Space']).toBe('capture');
      expect(SHORTCUTS['KeyP']).toBe('toggle-stream');
      expect(SHORTCUTS['Digit1']).toBe('region-full');
      expect(SHORTCUTS['Digit2']).toBe('region-face');
      expect(SHORTCUTS['Digit3']).toBe('region-body');
      expect(SHORTCUTS['KeyF']).toBe('fullscreen');
      expect(SHORTCUTS['BracketLeft']).toBe('sidebar');
      expect(SHORTCUTS['Slash']).toBe('help');
      expect(SHORTCUTS['Escape']).toBe('close');
    });
  });

  describe('basic shortcut dispatch', () => {
    it('calls capture handler on Space', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('Space');
      expect(handlers['capture']).toHaveBeenCalledTimes(1);
    });

    it('calls toggle-stream handler on KeyP', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('KeyP');
      expect(handlers['toggle-stream']).toHaveBeenCalledTimes(1);
    });

    it('calls region-full handler on Digit1', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('Digit1');
      expect(handlers['region-full']).toHaveBeenCalledTimes(1);
    });

    it('calls region-face handler on Digit2', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('Digit2');
      expect(handlers['region-face']).toHaveBeenCalledTimes(1);
    });

    it('calls region-body handler on Digit3', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('Digit3');
      expect(handlers['region-body']).toHaveBeenCalledTimes(1);
    });

    it('calls fullscreen handler on KeyF', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('KeyF');
      expect(handlers['fullscreen']).toHaveBeenCalledTimes(1);
    });

    it('calls sidebar handler on BracketLeft', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('BracketLeft');
      expect(handlers['sidebar']).toHaveBeenCalledTimes(1);
    });

    it('calls help handler on Slash', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('Slash');
      expect(handlers['help']).toHaveBeenCalledTimes(1);
    });

    it('calls close handler on Escape', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('Escape');
      expect(handlers['close']).toHaveBeenCalledTimes(1);
    });
  });

  describe('ignores input focus', () => {
    it('ignores shortcuts when input is focused', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      fireKeyOnElement(input, 'Space');
      expect(handlers['capture']).not.toHaveBeenCalled();
      document.body.removeChild(input);
    });

    it('ignores shortcuts when textarea is focused', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();
      fireKeyOnElement(textarea, 'KeyP');
      expect(handlers['toggle-stream']).not.toHaveBeenCalled();
      document.body.removeChild(textarea);
    });

    it('ignores shortcuts when select is focused', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      const select = document.createElement('select');
      document.body.appendChild(select);
      select.focus();
      fireKeyOnElement(select, 'Digit1');
      expect(handlers['region-full']).not.toHaveBeenCalled();
      document.body.removeChild(select);
    });

    it('ignores shortcuts when contentEditable element is focused', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      const div = document.createElement('div');
      div.contentEditable = 'true';
      document.body.appendChild(div);
      div.focus();
      fireKeyOnElement(div, 'Space');
      expect(handlers['capture']).not.toHaveBeenCalled();
      document.body.removeChild(div);
    });
  });

  describe('ignores modifier keys', () => {
    it('ignores when Ctrl is held', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('Space', { ctrlKey: true });
      expect(handlers['capture']).not.toHaveBeenCalled();
    });

    it('ignores when Meta (Cmd) is held', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('Space', { metaKey: true });
      expect(handlers['capture']).not.toHaveBeenCalled();
    });

    it('ignores when Alt is held', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('Space', { altKey: true });
      expect(handlers['capture']).not.toHaveBeenCalled();
    });

    it('does NOT ignore when Shift is held (for ? shortcut)', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('Slash', { shiftKey: true });
      expect(handlers['help']).toHaveBeenCalledTimes(1);
    });
  });

  describe('unregistered shortcuts', () => {
    it('does nothing for unregistered key codes', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      fireKey('KeyZ');
      for (const handler of Object.values(handlers)) {
        expect(handler).not.toHaveBeenCalled();
      }
    });

    it('does nothing for registered code with no handler', () => {
      const partial = { capture: vi.fn() };
      renderHook(() => useKeyboardShortcuts(partial));
      fireKey('KeyP'); // toggle-stream has no handler
      expect(partial.capture).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes event listener on unmount', () => {
      const spy = vi.spyOn(document, 'removeEventListener');
      const { unmount } = renderHook(() => useKeyboardShortcuts(handlers));
      unmount();
      expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
      spy.mockRestore();
    });
  });

  describe('handler updates', () => {
    it('uses latest handler reference without re-registering listener', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const { rerender } = renderHook(
        ({ capture }) => useKeyboardShortcuts({ capture }),
        { initialProps: { capture: handler1 } },
      );

      const addCount1 = addSpy.mock.calls.filter(c => c[0] === 'keydown').length;

      rerender({ capture: handler2 });

      const addCount2 = addSpy.mock.calls.filter(c => c[0] === 'keydown').length;
      // Should not add additional listeners on rerender
      expect(addCount2).toBe(addCount1);

      fireKey('Space');
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);

      addSpy.mockRestore();
    });
  });

  describe('preventDefault', () => {
    it('prevents default for Space to avoid page scroll', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      const event = fireKey('Space');
      expect(event.defaultPrevented).toBe(true);
    });

    it('does not prevent default for unhandled keys', () => {
      renderHook(() => useKeyboardShortcuts(handlers));
      const event = fireKey('KeyZ');
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
