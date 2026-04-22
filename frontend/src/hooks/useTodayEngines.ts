/**
 * useTodayEngines — Fetch timing engine data for the "Today" dashboard section
 * Caches Panchanga daily, polls Vedic Clock every 60s.
 * Uses the shared withAuthRecovery from useSelemene for transparent JWT renewal.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelemene } from './useSelemene';
import { useAppState } from '../context/appState';
import type { EngineInput, EngineOutput } from '../types/selemene';

interface TodayEngineState {
  panchanga: EngineOutput | null;
  vedicClock: EngineOutput | null;
  biorhythm: EngineOutput | null;
  numerology: EngineOutput | null;
  isLoading: boolean;
  error: Error | null;
}

export function useTodayEngines() {
  const { client, canAccessApi, withAuthRecovery } = useSelemene();
  const { state } = useAppState();
  const birthData = state.birthData;

  const [data, setData] = useState<TodayEngineState>({
    panchanga: null,
    vedicClock: null,
    biorhythm: null,
    numerology: null,
    isLoading: false,
    error: null,
  });

  const panchangaCacheDate = useRef<string | null>(null);
  const vedicClockInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const normalizeError = useCallback((reason: unknown): Error => {
    if (reason instanceof Error) return reason;
    return new Error(String(reason));
  }, []);

  const buildInput = useCallback((): EngineInput | null => {
    if (!birthData) return null;
    return {
      birth_data: birthData,
      current_time: new Date().toISOString(),
    };
  }, [birthData]);

  // Fetch all engines on mount and when birthData changes
  useEffect(() => {
    if (!canAccessApi || !birthData) return;
    let cancelled = false;

    async function fetchAll() {
      const input = buildInput();
      if (!input) return;

      setData(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const today = new Date().toISOString().slice(0, 10);
        const needsPanchanga = panchangaCacheDate.current !== today;

        const results = await Promise.allSettled([
          needsPanchanga
            ? withAuthRecovery(() => client.calculate('panchanga', input))
            : Promise.resolve(null),
          withAuthRecovery(() => client.calculate('vedic-clock', input)),
          withAuthRecovery(() => client.calculate('biorhythm', input)),
          withAuthRecovery(() => client.calculate('numerology', input)),
        ]);

        if (cancelled) return;

        const [panchangaRes, vedicClockRes, biorhythmRes, numerologyRes] = results;
        const fulfilledCount = results.filter((result) => result.status === 'fulfilled').length;
        const firstRejected = results.find((result) => result.status === 'rejected');
        const panchangaRejected = needsPanchanga && panchangaRes.status === 'rejected'
          ? normalizeError(panchangaRes.reason)
          : null;

        if (panchangaRejected) {
          console.warn('[useTodayEngines] Panchanga calculation failed:', panchangaRejected.message);
        }

        setData(prev => ({
          panchanga:
            panchangaRes.status === 'fulfilled' && panchangaRes.value
              ? panchangaRes.value
              : prev.panchanga,
          vedicClock:
            vedicClockRes.status === 'fulfilled'
              ? vedicClockRes.value
              : prev.vedicClock,
          biorhythm:
            biorhythmRes.status === 'fulfilled'
              ? biorhythmRes.value
              : prev.biorhythm,
          numerology:
            numerologyRes.status === 'fulfilled'
              ? numerologyRes.value
              : prev.numerology,
          isLoading: false,
          error:
            panchangaRejected
              ?? (fulfilledCount === 0 && firstRejected?.status === 'rejected'
                ? normalizeError(firstRejected.reason)
                : null),
        }));

        if (needsPanchanga && panchangaRes.status === 'fulfilled' && panchangaRes.value) {
          panchangaCacheDate.current = today;
        }
      } catch (err) {
        if (!cancelled) {
          setData(prev => ({
            ...prev,
            isLoading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          }));
        }
      }
    }

    fetchAll();

    // Poll Vedic Clock every 60s — uses recovery so expired tokens self-heal
    vedicClockInterval.current = setInterval(async () => {
      if (cancelled) return;
      const input = buildInput();
      if (!input) return;
      try {
        const result = await withAuthRecovery(() => client.calculate('vedic-clock', input));
        if (!cancelled) {
          setData(prev => ({ ...prev, vedicClock: result }));
        }
      } catch {
        // Silent fail on poll — keep last known state
      }
    }, 60_000);

    return () => {
      cancelled = true;
      if (vedicClockInterval.current) {
        clearInterval(vedicClockInterval.current);
      }
    };
  }, [
    canAccessApi,
    birthData,
    client,
    withAuthRecovery,
    buildInput,
    normalizeError,
  ]);

  return {
    ...data,
    hasBirthData: !!birthData,
  };
}
