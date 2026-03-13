import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { biofieldPersistenceService } from '../services/BiofieldPersistenceService';
import type {
  AnalysisResult,
  PersistenceHealthState,
  PersistedAnalysisHistoryResponse,
  PersistedBaseline,
  PersistedSessionRecord,
  PersistedSnapshotRecord,
  TimelineDataPoint,
} from '../types';

interface UseBiofieldPersistenceOptions {
  active: boolean;
}

export function useBiofieldPersistence({ active }: UseBiofieldPersistenceOptions) {
  const [health, setHealth] = useState<PersistenceHealthState>({
    enabled: false,
    healthy: false,
    configuredUserId: null,
  });
  const [session, setSession] = useState<PersistedSessionRecord | null>(null);
  const [sessions, setSessions] = useState<PersistedSessionRecord[]>([]);
  const [lastSnapshot, setLastSnapshot] = useState<PersistedSnapshotRecord | null>(null);
  const [snapshots, setSnapshots] = useState<PersistedSnapshotRecord[]>([]);
  const [history, setHistory] = useState<PersistedAnalysisHistoryResponse | null>(null);
  const [currentBaseline, setCurrentBaseline] = useState<PersistedBaseline | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFlushedTimelineIndexRef = useRef<number>(-1);

  const refreshHealth = useCallback(async () => {
    try {
      const next = await biofieldPersistenceService.getPersistenceState();
      setHealth(next);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load persistence state';
      setError(message);
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  const configuredUserId = health.configuredUserId;
  const canPersist = Boolean(active && configuredUserId && health.enabled && health.healthy);

  const ensureSession = useCallback(async () => {
    if (!canPersist) return session;
    if (session?.id && (session.status === 'active' || session.status === 'paused')) return session;

    setIsSyncing(true);
    setError(null);
    try {
      const created = await biofieldPersistenceService.createSession({
        userId: configuredUserId!,
        metadata: { source: 'frontend-cutover' },
      });
      lastFlushedTimelineIndexRef.current = -1;
      setSession(created);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create session';
      setError(message);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [canPersist, configuredUserId, session]);

  const flushTimeline = useCallback(async (timeline: TimelineDataPoint[]) => {
    if (!canPersist || !session?.id || timeline.length === 0) return;

    const pending = timeline.filter((point) => point.time > lastFlushedTimelineIndexRef.current);
    if (pending.length === 0) return;

    try {
      await biofieldPersistenceService.pushTimelineBatch({
        sessionId: session.id,
        userId: configuredUserId!,
        points: pending,
      });
      lastFlushedTimelineIndexRef.current = pending[pending.length - 1]?.time ?? lastFlushedTimelineIndexRef.current;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to flush timeline';
      setError(message);
    }
  }, [canPersist, configuredUserId, session]);

  const refreshSessions = useCallback(async () => {
    if (!configuredUserId || !health.enabled || !health.healthy) return null;
    try {
      const response = await biofieldPersistenceService.listSessions(configuredUserId);
      setSessions(response.items);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sessions';
      setError(message);
      return null;
    }
  }, [configuredUserId, health.enabled, health.healthy]);

  const refreshSnapshots = useCallback(async (sessionId?: string | null) => {
    if (!configuredUserId || !health.enabled || !health.healthy) return null;
    try {
      const response = await biofieldPersistenceService.listSnapshots(configuredUserId, sessionId);
      setSnapshots(response.items);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load snapshots';
      setError(message);
      return null;
    }
  }, [configuredUserId, health.enabled, health.healthy]);

  const recordCapture = useCallback(async (
    result: AnalysisResult | null,
    imageUrl?: string | null,
    options?: { createSnapshot?: boolean; snapshotLabel?: string },
  ) => {
    if (!canPersist || !session?.id || !configuredUserId) {
      return { readingId: biofieldPersistenceService.extractPersistedReadingId(result), snapshotId: null };
    }

    const readingId = biofieldPersistenceService.extractPersistedReadingId(result);
    if (!readingId) {
      return { readingId: null, snapshotId: null };
    }

    if (options?.createSnapshot === false) {
      void refreshSessions();
      return { readingId, snapshotId: null };
    }

    try {
      const snapshot = await biofieldPersistenceService.createSnapshot({
        userId: configuredUserId,
        sessionId: session.id,
        readingId,
        label: options?.snapshotLabel || 'Captured Analysis',
        metadata: imageUrl ? { previewImage: imageUrl.slice(0, 120) } : {},
      });
      setLastSnapshot(snapshot);
      void refreshSnapshots(session.id);
      void refreshSessions();
      return { readingId, snapshotId: snapshot.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create snapshot';
      setError(message);
      return { readingId, snapshotId: null };
    }
  }, [canPersist, configuredUserId, refreshSessions, refreshSnapshots, session]);

  const refreshHistory = useCallback(async () => {
    if (!configuredUserId || !health.enabled || !health.healthy) return null;
    try {
      const nextHistory = await biofieldPersistenceService.listHistory(configuredUserId);
      setHistory(nextHistory);
      return nextHistory;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load history';
      setError(message);
      return null;
    }
  }, [configuredUserId, health.enabled, health.healthy]);

  const refreshBaseline = useCallback(async () => {
    if (!configuredUserId || !health.enabled || !health.healthy) return null;
    try {
      const baseline = await biofieldPersistenceService.getCurrentBaseline(configuredUserId);
      setCurrentBaseline(baseline);
      return baseline;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load baseline';
      setError(message);
      return null;
    }
  }, [configuredUserId, health.enabled, health.healthy]);

  const pauseSession = useCallback(async () => {
    if (!session?.id || !canPersist) return null;
    const updated = await biofieldPersistenceService.pauseSession(session.id);
    setSession(updated);
    return updated;
  }, [canPersist, session]);

  const resumeSession = useCallback(async () => {
    if (!session?.id || !canPersist) return null;
    const updated = await biofieldPersistenceService.resumeSession(session.id);
    setSession(updated);
    return updated;
  }, [canPersist, session]);

  const completeSession = useCallback(async (durationSeconds?: number, summaryReadingId?: string) => {
    if (!session?.id || !canPersist) return null;
    const updated = await biofieldPersistenceService.completeSession(session.id, durationSeconds, summaryReadingId);
    setSession(updated);
    void refreshSessions();
    return updated;
  }, [canPersist, refreshSessions, session]);

  const saveConfiguredUserId = useCallback((userId: string) => {
    biofieldPersistenceService.setConfiguredUserId(userId);
    void refreshHealth();
  }, [refreshHealth]);

  const clearConfiguredUserId = useCallback(() => {
    biofieldPersistenceService.clearConfiguredUserId();
    setSession(null);
    setSessions([]);
    setLastSnapshot(null);
    setSnapshots([]);
    setHistory(null);
    setCurrentBaseline(null);
    lastFlushedTimelineIndexRef.current = -1;
    void refreshHealth();
  }, [refreshHealth]);

  useEffect(() => {
    if (!active) return;
    void ensureSession();
  }, [active, ensureSession]);

  useEffect(() => {
    if (!configuredUserId || !health.enabled || !health.healthy) return;
    void refreshSessions();
    void refreshSnapshots();
  }, [configuredUserId, health.enabled, health.healthy, refreshSessions, refreshSnapshots]);

  const state = useMemo(() => ({
    ...health,
    configuredUserId,
    canPersist,
    session,
    sessions,
    lastSnapshot,
    snapshots,
    history,
    currentBaseline,
    isSyncing,
    error,
  }), [canPersist, configuredUserId, currentBaseline, error, health, history, isSyncing, lastSnapshot, session, sessions, snapshots]);

  return {
    ...state,
    refreshHealth,
    ensureSession,
    flushTimeline,
    recordCapture,
    refreshSessions,
    refreshSnapshots,
    refreshHistory,
    refreshBaseline,
    pauseSession,
    resumeSession,
    completeSession,
    saveConfiguredUserId,
    clearConfiguredUserId,
  };
}
