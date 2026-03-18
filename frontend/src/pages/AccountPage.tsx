import React, { useEffect, useMemo, useState } from 'react';
import { UserCircle2, ShieldCheck, Save, RotateCcw, Database, History, Camera } from 'lucide-react';
import type { PersistedSessionRecord, PersistedSnapshotRecord } from '../types';

interface AccountPageProps {
  configuredUserId: string | null;
  canPersist: boolean;
  persistenceEnabled: boolean;
  persistenceHealthy: boolean;
  sessionId?: string | null;
  sessionStatus?: string | null;
  historyTotal?: number;
  lastReadingId?: string | null;
  lastSnapshotId?: string | null;
  baselineName?: string | null;
  sessions: PersistedSessionRecord[];
  snapshots: PersistedSnapshotRecord[];
  error?: string | null;
  onSaveUserId: (userId: string) => void;
  onClearUserId: () => void;
  onRefresh: () => void;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

export const AccountPage: React.FC<AccountPageProps> = ({
  configuredUserId,
  canPersist,
  persistenceEnabled,
  persistenceHealthy,
  sessionId,
  sessionStatus,
  historyTotal,
  lastReadingId,
  lastSnapshotId,
  baselineName,
  sessions,
  snapshots,
  error,
  onSaveUserId,
  onClearUserId,
  onRefresh,
}) => {
  const [userIdInput, setUserIdInput] = useState(configuredUserId ?? '');

  useEffect(() => {
    setUserIdInput(configuredUserId ?? '');
  }, [configuredUserId]);

  const recentSessions = useMemo(() => sessions.slice(0, 8), [sessions]);
  const recentSnapshots = useMemo(() => snapshots.slice(0, 8), [snapshots]);

  return (
    <div className="h-full min-h-0 grid grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden">
      <div className="mystic-page-header flex items-center justify-between gap-3">
        <div>
          <h1 className="mystic-section-title text-lg sm:text-xl">Account</h1>
          <p className="mt-1 text-sm text-pip-text-secondary">Selemene identity, persistence health, and recent Selemene records.</p>
        </div>
        <button className="mystic-btn mystic-btn-secondary !px-3 !py-2" onClick={onRefresh}>Refresh</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.35fr)] gap-3 min-h-0 overflow-auto pr-1">
        <div className="grid grid-cols-1 gap-3 min-h-0">
          <section className="mystic-panel !p-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <UserCircle2 className="w-6 h-6 text-pip-gold" />
              <div>
                <span className="mystic-eyebrow">Profile</span>
                <p className="mt-2 text-sm text-pip-text-secondary">Configure the active Selemene user UUID used by the frontend persistence bridge.</p>
              </div>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-pip-text-muted">Active Selemene User ID</span>
              <input
                value={userIdInput}
                onChange={(event) => setUserIdInput(event.target.value)}
                placeholder="11111111-1111-1111-1111-111111111111"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-pip-accent/50"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                className="mystic-btn mystic-btn-primary !px-3 !py-2 flex items-center gap-2"
                onClick={() => onSaveUserId(userIdInput)}
                disabled={userIdInput.trim().length === 0}
              >
                <Save className="w-4 h-4" />
                Save User ID
              </button>
              <button className="mystic-btn mystic-btn-ghost !px-3 !py-2 flex items-center gap-2" onClick={onClearUserId}>
                <RotateCcw className="w-4 h-4" />
                Clear
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Configured user</div>
                <div className="mystic-data-value text-sm break-all">{configuredUserId ?? 'Not configured'}</div>
              </div>
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Active baseline</div>
                <div className="mystic-data-value text-sm">{baselineName ?? 'None yet'}</div>
              </div>
            </div>
          </section>

          <section className="mystic-panel !p-4 flex gap-3">
            <ShieldCheck className="w-6 h-6 text-pip-gold" />
            <div className="min-w-0 flex-1">
              <span className="mystic-eyebrow">Backend persistence</span>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="mystic-status !p-3">
                  <div className="mystic-data-label">Enabled</div>
                  <div className="mystic-data-value text-sm">{persistenceEnabled ? 'Yes' : 'No'}</div>
                </div>
                <div className="mystic-status !p-3">
                  <div className="mystic-data-label">Healthy</div>
                  <div className="mystic-data-value text-sm">{persistenceHealthy ? 'Yes' : 'No'}</div>
                </div>
                <div className="mystic-status !p-3 col-span-2">
                  <div className="mystic-data-label">Frontend cutover state</div>
                  <div className="mystic-data-value text-sm">{canPersist ? 'Persistence armed' : 'Preview-only mode'}</div>
                </div>
              </div>
              {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
            </div>
          </section>

          <section className="mystic-panel !p-4 flex gap-3">
            <Database className="w-6 h-6 text-pip-gold" />
            <div className="min-w-0 flex-1">
              <span className="mystic-eyebrow">Current persistence context</span>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
                <div className="mystic-status !p-3">
                  <div className="mystic-data-label">Session ID</div>
                  <div className="mystic-data-value text-sm break-all">{sessionId ?? 'Not bootstrapped'}</div>
                </div>
                <div className="mystic-status !p-3">
                  <div className="mystic-data-label">Session status</div>
                  <div className="mystic-data-value text-sm">{sessionStatus ?? 'Idle'}</div>
                </div>
                <div className="mystic-status !p-3">
                  <div className="mystic-data-label">Last reading</div>
                  <div className="mystic-data-value text-sm break-all">{lastReadingId ?? 'No persisted capture yet'}</div>
                </div>
                <div className="mystic-status !p-3">
                  <div className="mystic-data-label">Last snapshot</div>
                  <div className="mystic-data-value text-sm break-all">{lastSnapshotId ?? 'No persisted snapshot yet'}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="mystic-panel !p-4 flex gap-3">
            <Camera className="w-6 h-6 text-pip-gold" />
            <div>
              <span className="mystic-eyebrow">Cutover note</span>
              <p className="mt-2 text-sm text-pip-text-secondary">
                Capture still preserves local preview UX, but when the backend is healthy and a Selemene user UUID is configured, the app now threads session and snapshot context into the persistence layer.
              </p>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3 min-h-0">
          <section className="mystic-panel !p-4 min-h-[320px] flex flex-col">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-pip-gold" />
                <div>
                  <span className="mystic-eyebrow">Recent sessions</span>
                  <p className="mt-1 text-xs text-pip-text-secondary">Persisted Selemene sessions for the configured user.</p>
                </div>
              </div>
              <div className="mystic-badge !text-[10px] !px-2.5 !py-1">{recentSessions.length}</div>
            </div>

            <div className="mt-4 flex-1 min-h-0 overflow-auto space-y-3 pr-1">
              {recentSessions.length === 0 ? (
                <div className="mystic-status !p-3 text-sm text-pip-text-secondary">No persisted sessions yet.</div>
              ) : recentSessions.map((item) => (
                <div key={item.id} className="mystic-status !p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mystic-data-value text-sm">{item.status}</div>
                      <div className="mystic-data-label mt-1">{formatDateTime(item.started_at ?? item.created_at)}</div>
                    </div>
                    <div className="mystic-badge !text-[10px] !px-2 !py-1">{item.analysis_region ?? 'full'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="mystic-data-label">Duration</div>
                      <div className="text-pip-text-primary">{formatDuration(item.duration_seconds)}</div>
                    </div>
                    <div>
                      <div className="mystic-data-label">Samples</div>
                      <div className="text-pip-text-primary">{item.timeline_point_count ?? 0}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-pip-text-muted break-all">{item.id}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mystic-panel !p-4 min-h-[320px] flex flex-col">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-pip-gold" />
                <div>
                  <span className="mystic-eyebrow">Recent snapshots</span>
                  <p className="mt-1 text-xs text-pip-text-secondary">User-visible capture events linked to sessions and readings.</p>
                </div>
              </div>
              <div className="mystic-badge !text-[10px] !px-2.5 !py-1">{recentSnapshots.length}</div>
            </div>

            <div className="mt-4 flex-1 min-h-0 overflow-auto space-y-3 pr-1">
              {recentSnapshots.length === 0 ? (
                <div className="mystic-status !p-3 text-sm text-pip-text-secondary">No persisted snapshots yet.</div>
              ) : recentSnapshots.map((item) => (
                <div key={item.id} className="mystic-status !p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mystic-data-value text-sm">{item.label ?? 'Captured Analysis'}</div>
                      <div className="mystic-data-label mt-1">{formatDateTime(item.captured_at ?? item.created_at)}</div>
                    </div>
                    <div className="mystic-badge !text-[10px] !px-2 !py-1">{item.analysis_region ?? 'full'}</div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div>
                      <div className="mystic-data-label">Reading</div>
                      <div className="text-pip-text-primary break-all">{item.reading_id ?? '—'}</div>
                    </div>
                    <div>
                      <div className="mystic-data-label">Session</div>
                      <div className="text-pip-text-primary break-all">{item.session_id ?? '—'}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-pip-text-muted break-all">{item.id}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mystic-panel !p-4 2xl:col-span-2 flex gap-3">
            <Database className="w-6 h-6 text-pip-gold" />
            <div className="min-w-0 flex-1">
              <span className="mystic-eyebrow">Legacy reading-history bridge</span>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="mystic-status !p-3">
                  <div className="mystic-data-label">History items</div>
                  <div className="mystic-data-value text-sm">{typeof historyTotal === 'number' ? historyTotal : 0}</div>
                </div>
                <div className="mystic-status !p-3">
                  <div className="mystic-data-label">Sessions loaded</div>
                  <div className="mystic-data-value text-sm">{sessions.length}</div>
                </div>
                <div className="mystic-status !p-3">
                  <div className="mystic-data-label">Snapshots loaded</div>
                  <div className="mystic-data-value text-sm">{snapshots.length}</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
