import { ensureBackendReady, getBackendHealth } from '../utils/runtimeApi';
import {
  USER_ID_STORAGE_KEY,
  clearPersistenceUserId,
  setManualPersistenceUserId,
} from '../context/auth/authOAuth';
import type {
  AnalysisResult,
  PersistenceHealthState,
  PersistedAnalysisHistoryResponse,
  PersistedBaseline,
  PersistedSessionRecord,
  PersistedSnapshotRecord,
  TimelineDataPoint,
} from '../types';

interface SessionCreatePayload {
  userId: string;
  analysisMode?: 'fullBody' | 'face' | 'segmented';
  analysisRegion?: 'full' | 'face' | 'body';
  sourceKind?: 'live-estimate' | 'backend-detailed' | 'python-engine' | 'rust-engine';
  metadata?: Record<string, unknown>;
}

interface TimelineBatchPayload {
  sessionId: string;
  userId: string;
  points: TimelineDataPoint[];
}

interface SnapshotCreatePayload {
  userId: string;
  sessionId?: string;
  readingId?: string;
  label?: string;
  analysisRegion?: 'full' | 'face' | 'body';
  sourceKind?: 'live-estimate' | 'backend-detailed' | 'python-engine' | 'rust-engine';
  metadata?: Record<string, unknown>;
}

class SelemenePersistenceService {
  getConfiguredUserId(): string | null {
    if (typeof window === 'undefined') return null;

    const envUser = typeof import.meta.env.VITE_SELEMENE_USER_ID === 'string'
      ? import.meta.env.VITE_SELEMENE_USER_ID.trim()
      : '';
    if (envUser.length > 0) return envUser;

    const stored = window.localStorage.getItem(USER_ID_STORAGE_KEY)?.trim() ?? '';
    return stored.length > 0 ? stored : null;
  }

  setConfiguredUserId(userId: string): void {
    if (typeof window === 'undefined') return;
    setManualPersistenceUserId(window.localStorage, userId);
  }

  clearConfiguredUserId(): void {
    if (typeof window === 'undefined') return;
    clearPersistenceUserId(window.localStorage);
  }

  async getPersistenceState(): Promise<PersistenceHealthState> {
    const readiness = await ensureBackendReady();
    if (!readiness.ready) {
      return {
        enabled: false,
        healthy: false,
        configuredUserId: this.getConfiguredUserId(),
        error: readiness.error ?? 'Backend is not ready',
      };
    }

    const health = await getBackendHealth();
    const persistence = health?.persistence;

    return {
      enabled: Boolean(persistence?.enabled),
      healthy: Boolean(persistence?.healthy),
      reason: persistence?.reason,
      detail: persistence?.detail,
      configuredUserId: this.getConfiguredUserId(),
      baseUrl: readiness.baseUrl,
      error: persistence?.healthy === false ? (persistence?.detail ?? persistence?.reason) : undefined,
    };
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const readiness = await ensureBackendReady();
    if (!readiness.ready) {
      throw new Error(readiness.error || 'Backend is not ready');
    }

    const response = await fetch(`${readiness.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed (${response.status})`);
    }

    return response.json() as Promise<T>;
  }

  async createSession(payload: SessionCreatePayload): Promise<PersistedSessionRecord> {
    return this.fetchJson<PersistedSessionRecord>('/api/v1/sessions', {
      method: 'POST',
      body: JSON.stringify({
        user_id: payload.userId,
        analysis_mode: payload.analysisMode ?? 'fullBody',
        analysis_region: payload.analysisRegion ?? 'full',
        source_kind: payload.sourceKind ?? 'live-estimate',
        metadata: payload.metadata ?? {},
      }),
    });
  }

  async updateSession(sessionId: string, payload: Record<string, unknown>): Promise<PersistedSessionRecord> {
    return this.fetchJson<PersistedSessionRecord>(`/api/v1/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async pauseSession(sessionId: string): Promise<PersistedSessionRecord> {
    return this.fetchJson<PersistedSessionRecord>(`/api/v1/sessions/${sessionId}/pause`, { method: 'POST' });
  }

  async resumeSession(sessionId: string): Promise<PersistedSessionRecord> {
    return this.fetchJson<PersistedSessionRecord>(`/api/v1/sessions/${sessionId}/resume`, { method: 'POST' });
  }

  async completeSession(sessionId: string, durationSeconds?: number, summaryReadingId?: string): Promise<PersistedSessionRecord> {
    const params = new URLSearchParams();
    if (typeof durationSeconds === 'number') params.set('duration_seconds', String(durationSeconds));
    if (summaryReadingId) params.set('summary_reading_id', summaryReadingId);
    return this.fetchJson<PersistedSessionRecord>(`/api/v1/sessions/${sessionId}/complete?${params.toString()}`, { method: 'POST' });
  }

  async listSessions(userId: string): Promise<{ total: number; items: PersistedSessionRecord[] }> {
    return this.fetchJson(`/api/v1/sessions?user_id=${encodeURIComponent(userId)}&limit=20&offset=0`);
  }

  async listSnapshots(userId: string, sessionId?: string | null): Promise<{ total: number; items: PersistedSnapshotRecord[] }> {
    const params = new URLSearchParams({
      user_id: userId,
      limit: '20',
      offset: '0',
    });
    if (sessionId) params.set('session_id', sessionId);
    return this.fetchJson(`/api/v1/snapshots?${params.toString()}`);
  }

  async pushTimelineBatch(payload: TimelineBatchPayload): Promise<{ count: number; items: Array<Record<string, unknown>> }> {
    return this.fetchJson('/api/v1/timeline/batch', {
      method: 'POST',
      body: JSON.stringify({
        session_id: payload.sessionId,
        user_id: payload.userId,
        points: payload.points.map((point, index) => ({
          sample_index: point.time,
          sample_time_ms: point.time * 1000,
          score_vector: {
            energy: point.energy,
            symmetry: point.symmetry,
            coherence: point.coherence,
          },
          metric_vector: {
            source: 'frontend-live',
            sequence: index,
          },
        })),
      }),
    });
  }

  async createSnapshot(payload: SnapshotCreatePayload): Promise<PersistedSnapshotRecord> {
    return this.fetchJson<PersistedSnapshotRecord>('/api/v1/snapshots', {
      method: 'POST',
      body: JSON.stringify({
        user_id: payload.userId,
        session_id: payload.sessionId,
        reading_id: payload.readingId,
        label: payload.label,
        analysis_region: payload.analysisRegion ?? 'full',
        source_kind: payload.sourceKind ?? 'backend-detailed',
        metadata: payload.metadata ?? {},
      }),
    });
  }

  async listHistory(userId: string): Promise<PersistedAnalysisHistoryResponse> {
    return this.fetchJson<PersistedAnalysisHistoryResponse>(`/api/v1/analysis/history?user_id=${encodeURIComponent(userId)}&limit=20&offset=0`);
  }

  async getCurrentBaseline(userId: string): Promise<PersistedBaseline | null> {
    const response = await this.fetchJson<Record<string, unknown>>(`/api/v1/baseline/current?user_id=${encodeURIComponent(userId)}`);
    if (!response.id || !response.user_id) return null;
    return {
      id: String(response.id),
      user_id: String(response.user_id),
      name: typeof response.name === 'string' ? response.name : null,
      is_active: Boolean(response.is_active),
      source_session_id: typeof response.source_session_id === 'string' ? response.source_session_id : null,
      source_snapshot_id: typeof response.source_snapshot_id === 'string' ? response.source_snapshot_id : null,
      source_reading_id: typeof response.source_reading_id === 'string' ? response.source_reading_id : null,
      baseline_scores: (response.baseline_scores as Record<string, number> | undefined) ?? {},
      baseline_metrics: (response.baseline_metrics as Record<string, number> | undefined) ?? {},
      provenance: (response.provenance as Record<string, unknown> | undefined) ?? {},
      created_at: typeof response.created_at === 'string' ? response.created_at : undefined,
      updated_at: typeof response.updated_at === 'string' ? response.updated_at : undefined,
    };
  }

  extractPersistedReadingId(result: AnalysisResult | null): string | null {
    if (!result?.persistedReadingId) return null;
    return result.persistedReadingId;
  }
}

export const selemenePersistenceService = new SelemenePersistenceService();
