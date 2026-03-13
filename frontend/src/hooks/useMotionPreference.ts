/**
 * useMotionPreference — combines app setting + OS preference
 *
 * Reads `data-biofield-motion` from <html> (set by useBiofieldSettings)
 * and also checks `prefers-reduced-motion` media query.
 *
 * If the OS prefers reduced motion, the effective level is upgraded to at
 * least "reduced", even when the app setting is "full".
 */
import { useState, useEffect } from 'react';

export type MotionLevel = 'full' | 'reduced' | 'minimal';

export interface MotionPreference {
  /** true only when full motion is allowed (app + OS) */
  shouldAnimate: boolean;
  /** true when effective level is "reduced" or "minimal" */
  isReduced: boolean;
  /** true only when effective level is "minimal" — no motion at all */
  isMinimal: boolean;
  /** the computed effective motion level */
  motionLevel: MotionLevel;
}

// ── Read the data attribute from <html> ────────────────────────────────

function readAttributeLevel(): MotionLevel {
  if (typeof document === 'undefined') return 'full';
  const raw = document.documentElement.dataset.biofieldMotion;
  if (raw === 'reduced' || raw === 'minimal') return raw;
  return 'full';
}

// ── Read the OS preference ─────────────────────────────────────────────

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined') return null;
  return window.matchMedia('(prefers-reduced-motion: reduce)');
}

function readOSPrefersReduced(): boolean {
  return getMediaQuery()?.matches ?? false;
}

// ── Compute effective level ────────────────────────────────────────────

function computeEffective(appLevel: MotionLevel, osPrefersReduced: boolean): MotionLevel {
  // Minimal always wins — it's the strongest constraint
  if (appLevel === 'minimal') return 'minimal';
  // If OS wants reduced, upgrade "full" → "reduced"
  if (osPrefersReduced) return 'reduced';
  return appLevel;
}

// ── The hook ───────────────────────────────────────────────────────────

export function useMotionPreference(): MotionPreference {
  const [appLevel, setAppLevel] = useState<MotionLevel>(readAttributeLevel);
  const [osPrefersReduced, setOSPrefersReduced] = useState<boolean>(readOSPrefersReduced);

  // Watch <html> data-biofield-motion via MutationObserver
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const observer = new MutationObserver(() => {
      setAppLevel(readAttributeLevel());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-biofield-motion'],
    });

    return () => observer.disconnect();
  }, []);

  // Watch OS prefers-reduced-motion via matchMedia listener
  useEffect(() => {
    const mql = getMediaQuery();
    if (!mql) return;

    const handler = (e: MediaQueryListEvent) => {
      setOSPrefersReduced(e.matches);
    };

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const motionLevel = computeEffective(appLevel, osPrefersReduced);

  return {
    shouldAnimate: motionLevel === 'full',
    isReduced: motionLevel === 'reduced' || motionLevel === 'minimal',
    isMinimal: motionLevel === 'minimal',
    motionLevel,
  };
}
