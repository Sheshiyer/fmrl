/**
 * Tests for useMotionPreference hook
 * RED phase: These tests define the contract before implementation
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMotionPreference } from '../../hooks/useMotionPreference';

// Helper to set data-biofield-motion on <html>
function setMotionAttribute(value: string | null) {
  if (value === null) {
    document.documentElement.removeAttribute('data-biofield-motion');
  } else {
    document.documentElement.dataset.biofieldMotion = value;
  }
}

// Mock matchMedia
function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    },
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    },
    dispatchEvent: () => true,
  };

  window.matchMedia = vi.fn().mockReturnValue(mql);
  return {
    mql,
    triggerChange(newMatches: boolean) {
      mql.matches = newMatches;
      for (const cb of listeners) {
        cb({ matches: newMatches } as MediaQueryListEvent);
      }
    },
  };
}

describe('useMotionPreference', () => {
  beforeEach(() => {
    setMotionAttribute(null);
    mockMatchMedia(false);
  });

  afterEach(() => {
    setMotionAttribute(null);
    vi.restoreAllMocks();
  });

  it('returns full motion when attribute is "full" and OS allows motion', () => {
    setMotionAttribute('full');
    mockMatchMedia(false);

    const { result } = renderHook(() => useMotionPreference());

    expect(result.current.motionLevel).toBe('full');
    expect(result.current.shouldAnimate).toBe(true);
    expect(result.current.isReduced).toBe(false);
    expect(result.current.isMinimal).toBe(false);
  });

  it('returns reduced when attribute is "reduced"', () => {
    setMotionAttribute('reduced');
    mockMatchMedia(false);

    const { result } = renderHook(() => useMotionPreference());

    expect(result.current.motionLevel).toBe('reduced');
    expect(result.current.shouldAnimate).toBe(false);
    expect(result.current.isReduced).toBe(true);
    expect(result.current.isMinimal).toBe(false);
  });

  it('returns minimal when attribute is "minimal"', () => {
    setMotionAttribute('minimal');
    mockMatchMedia(false);

    const { result } = renderHook(() => useMotionPreference());

    expect(result.current.motionLevel).toBe('minimal');
    expect(result.current.shouldAnimate).toBe(false);
    expect(result.current.isReduced).toBe(true);
    expect(result.current.isMinimal).toBe(true);
  });

  it('upgrades to "reduced" when OS prefers-reduced-motion is set and attribute is "full"', () => {
    setMotionAttribute('full');
    mockMatchMedia(true);

    const { result } = renderHook(() => useMotionPreference());

    expect(result.current.motionLevel).toBe('reduced');
    expect(result.current.shouldAnimate).toBe(false);
    expect(result.current.isReduced).toBe(true);
    expect(result.current.isMinimal).toBe(false);
  });

  it('keeps "minimal" even when OS does not prefer reduced motion', () => {
    setMotionAttribute('minimal');
    mockMatchMedia(false);

    const { result } = renderHook(() => useMotionPreference());

    expect(result.current.motionLevel).toBe('minimal');
    expect(result.current.isMinimal).toBe(true);
  });

  it('treats missing attribute as "full"', () => {
    setMotionAttribute(null);
    mockMatchMedia(false);

    const { result } = renderHook(() => useMotionPreference());

    expect(result.current.motionLevel).toBe('full');
    expect(result.current.shouldAnimate).toBe(true);
  });

  it('reacts to OS matchMedia changes', () => {
    setMotionAttribute('full');
    const { triggerChange } = mockMatchMedia(false);

    const { result } = renderHook(() => useMotionPreference());
    expect(result.current.shouldAnimate).toBe(true);

    act(() => {
      triggerChange(true);
    });

    expect(result.current.motionLevel).toBe('reduced');
    expect(result.current.shouldAnimate).toBe(false);
  });

  it('reacts to data attribute changes via MutationObserver', async () => {
    setMotionAttribute('full');
    mockMatchMedia(false);

    const { result } = renderHook(() => useMotionPreference());
    expect(result.current.shouldAnimate).toBe(true);

    act(() => {
      setMotionAttribute('minimal');
    });

    // MutationObserver callback is async — wait for React to re-render
    await waitFor(() => {
      expect(result.current.isMinimal).toBe(true);
    });
  });
});
