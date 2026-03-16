import React from 'react';
import { Palette, Camera, Activity, RotateCcw, SlidersHorizontal, Database, Sparkles, RefreshCw, Save, Cloud, HardDrive } from 'lucide-react';
import type {
  AppearanceSettings,
  SelemeneSettingsPreferences,
  CaptureExportSettings,
  PersistedBaseline,
  PersistedSessionRecord,
  PersistedSnapshotRecord,
  RuntimeSettings,
} from '../types';

interface SettingsPageProps {
  settings: SelemeneSettingsPreferences;
  backendConnected: boolean;
  persistenceEnabled: boolean;
  persistenceHealthy: boolean;
  configuredUserId: string | null;
  currentSession: PersistedSessionRecord | null;
  currentBaseline: PersistedBaseline | null;
  sessionsCount: number;
  snapshotsCount: number;
  lastSnapshot: PersistedSnapshotRecord | null;
  remoteSettingsLoaded: boolean;
  isLoadingRemoteSettings: boolean;
  isSavingRemoteSettings: boolean;
  lastSyncedAt?: string | null;
  syncError?: string | null;
  profileExists?: boolean;
  onReloadRemoteSettings: () => void;
  onSaveRemoteSettings: () => void;
  onUpdateAppearance: (patch: Partial<AppearanceSettings>) => void;
  onUpdateRuntime: (patch: Partial<RuntimeSettings>) => void;
  onUpdateCapture: (patch: Partial<CaptureExportSettings>) => void;
  onReset: () => void;
}

function SectionHeader({ icon, title, description, badge }: { icon: React.ReactNode; title: string; description: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl border border-pip-border/50 bg-black/20 flex items-center justify-center text-pip-gold">{icon}</div>
        <div>
          <div className="mystic-eyebrow">{title}</div>
          <p className="mt-2 text-sm text-pip-text-secondary">{description}</p>
        </div>
      </div>
      {badge}
    </div>
  );
}

function SegmentedOption<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-pip-border/50 bg-black/20 p-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`mystic-btn !px-3 !py-2 !text-xs ${value === option.value ? 'mystic-btn-primary' : 'mystic-btn-ghost'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="mystic-status !p-3 flex items-start justify-between gap-3 cursor-pointer">
      <div>
        <div className="mystic-data-value text-sm">{label}</div>
        <div className="mt-1 text-xs text-pip-text-secondary">{description}</div>
      </div>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[var(--pip-accent)]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  backendConnected,
  persistenceEnabled,
  persistenceHealthy,
  configuredUserId,
  currentSession,
  currentBaseline,
  sessionsCount,
  snapshotsCount,
  lastSnapshot,
  remoteSettingsLoaded,
  isLoadingRemoteSettings,
  isSavingRemoteSettings,
  lastSyncedAt,
  syncError,
  profileExists,
  onReloadRemoteSettings,
  onSaveRemoteSettings,
  onUpdateAppearance,
  onUpdateRuntime,
  onUpdateCapture,
  onReset,
}) => {
  const syncBadge = configuredUserId
    ? remoteSettingsLoaded
      ? 'Profile linked'
      : 'Awaiting sync'
    : 'No profile user';

  return (
    <div className="h-full min-h-0 grid grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden">
      <div className="mystic-page-header flex items-center justify-between gap-3">
        <div>
          <h1 className="mystic-section-title text-lg sm:text-xl">Settings</h1>
          <p className="mt-1 text-sm text-pip-text-secondary">Behavior, defaults, diagnostics, and sync policy for the Selemene workspace.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="mystic-badge">{syncBadge}</span>
          <button className="mystic-btn mystic-btn-ghost !px-3 !py-2 flex items-center gap-2" onClick={onReloadRemoteSettings} disabled={isLoadingRemoteSettings || !configuredUserId}>
            <RefreshCw className="w-4 h-4" />
            {isLoadingRemoteSettings ? 'Reloading…' : 'Reload Synced'}
          </button>
          <button className="mystic-btn mystic-btn-primary !px-3 !py-2 flex items-center gap-2" onClick={onSaveRemoteSettings} disabled={isSavingRemoteSettings || !configuredUserId}>
            <Save className="w-4 h-4" />
            {isSavingRemoteSettings ? 'Saving…' : 'Save Synced Settings'}
          </button>
          <button className="mystic-btn mystic-btn-secondary !px-3 !py-2 flex items-center gap-2" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-3 min-h-0 overflow-auto pr-1">
        <div className="grid grid-cols-1 gap-3 min-h-0">
          <section className="mystic-panel !p-4 flex flex-col gap-4">
            <SectionHeader
              icon={<Palette className="w-4 h-4" />}
              title="Appearance"
              description="Tune the visual calm, density, and stage affordances for the one-fold bento workspace."
              badge={<span className="mystic-badge !text-[10px] !px-2.5 !py-1 inline-flex items-center gap-1"><Cloud className="w-3 h-3" /> Selene profile</span>}
            />

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="mystic-data-label">Theme mode</div>
                <SegmentedOption
                  value={settings.appearance.themeMode}
                  options={[
                    { value: 'sacred-dark', label: 'Sacred Dark' },
                    { value: 'dim', label: 'Dim' },
                    { value: 'high-contrast', label: 'High Contrast' },
                  ]}
                  onChange={(themeMode) => onUpdateAppearance({ themeMode })}
                />
              </div>

              <div className="space-y-2">
                <div className="mystic-data-label">Workspace density</div>
                <SegmentedOption
                  value={settings.appearance.workspaceDensity}
                  options={[
                    { value: 'compact', label: 'Compact' },
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'spacious', label: 'Spacious' },
                  ]}
                  onChange={(workspaceDensity) => onUpdateAppearance({ workspaceDensity })}
                />
              </div>

              <div className="space-y-2">
                <div className="mystic-data-label">Motion level</div>
                <SegmentedOption
                  value={settings.appearance.motionLevel}
                  options={[
                    { value: 'full', label: 'Full' },
                    { value: 'reduced', label: 'Reduced' },
                    { value: 'minimal', label: 'Minimal' },
                  ]}
                  onChange={(motionLevel) => onUpdateAppearance({ motionLevel })}
                />
              </div>

              <div className="space-y-2">
                <div className="mystic-data-label">Accent profile</div>
                <SegmentedOption
                  value={settings.appearance.accentProfile}
                  options={[
                    { value: 'gold', label: 'Gold' },
                    { value: 'violet', label: 'Violet' },
                    { value: 'neutral', label: 'Neutral' },
                  ]}
                  onChange={(accentProfile) => onUpdateAppearance({ accentProfile })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
              <ToggleRow
                label="Show overlay legend by default"
                description="Controls whether the stage legend opens visible when the dashboard loads."
                checked={settings.appearance.showOverlayLegend}
                onChange={(showOverlayLegend) => onUpdateAppearance({ showOverlayLegend })}
              />
              <ToggleRow
                label="Show stage signals rail"
                description="Keeps the right-side stage signals slab visible for richer capture context."
                checked={settings.appearance.showStageSignals}
                onChange={(showStageSignals) => onUpdateAppearance({ showStageSignals })}
              />
            </div>
          </section>

          <section className="mystic-panel !p-4 flex flex-col gap-4">
            <SectionHeader
              icon={<Activity className="w-4 h-4" />}
              title="Runtime"
              description="See how the local shell is behaving against the backend and choose safe runtime defaults."
              badge={<span className="mystic-badge !text-[10px] !px-2.5 !py-1 inline-flex items-center gap-1"><HardDrive className="w-3 h-3" /> This device only</span>}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-3 text-sm">
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Backend link</div>
                <div className="mystic-data-value text-sm">{backendConnected ? 'Connected' : 'Offline'}</div>
              </div>
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Persistence</div>
                <div className="mystic-data-value text-sm">{persistenceEnabled ? 'Enabled' : 'Disabled'}</div>
              </div>
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Persistence health</div>
                <div className="mystic-data-value text-sm">{persistenceHealthy ? 'Healthy' : 'Degraded'}</div>
              </div>
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Configured user</div>
                <div className="mystic-data-value text-sm break-all">{configuredUserId ?? 'Not set'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
              <ToggleRow
                label="Show backend logs overlay"
                description="Keeps the desktop backend logs drawer available from anywhere in the app shell."
                checked={settings.runtime.showBackendLogs ?? false}
                onChange={(showBackendLogs) => onUpdateRuntime({ showBackendLogs })}
              />
              <ToggleRow
                label="Show diagnostics summary"
                description="Keep runtime state visible in Settings while the persistence stack is still maturing."
                checked={settings.runtime.showDiagnosticsSummary ?? false}
                onChange={(showDiagnosticsSummary) => onUpdateRuntime({ showDiagnosticsSummary })}
              />
              <ToggleRow
                label="Auto-fallback to preview-only"
                description="If the backend is unhealthy, treat the local preview path as the safe default behavior."
                checked={settings.runtime.autoFallbackToPreview ?? false}
                onChange={(autoFallbackToPreview) => onUpdateRuntime({ autoFallbackToPreview })}
              />
              <ToggleRow
                label="Enable backend-backed capture"
                description="When disabled, the dashboard keeps local capture preview behavior without backend analysis or persistence writes."
                checked={settings.runtime.enableBackendCapture ?? false}
                onChange={(enableBackendCapture) => onUpdateRuntime({ enableBackendCapture })}
              />
            </div>
          </section>

          <section className="mystic-panel !p-4 flex flex-col gap-4">
            <SectionHeader
              icon={<Camera className="w-4 h-4" />}
              title="Capture & Export"
              description="Set the default analysis behavior, snapshot policy, and export intent for the Selemene capture flow."
              badge={<span className="mystic-badge !text-[10px] !px-2.5 !py-1 inline-flex items-center gap-1"><Cloud className="w-3 h-3" /> Selene profile</span>}
            />

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="mystic-data-label">Default analysis region</div>
                <SegmentedOption
                  value={settings.capture.defaultAnalysisRegion}
                  options={[
                    { value: 'full', label: 'Full' },
                    { value: 'face', label: 'Face' },
                    { value: 'body', label: 'Body' },
                  ]}
                  onChange={(defaultAnalysisRegion) => onUpdateCapture({ defaultAnalysisRegion })}
                />
              </div>

              <div className="space-y-2">
                <div className="mystic-data-label">Preferred export bundle</div>
                <SegmentedOption
                  value={settings.capture.exportBundle}
                  options={[
                    { value: 'json', label: 'JSON' },
                    { value: 'html', label: 'HTML' },
                    { value: 'pdf', label: 'PDF' },
                    { value: 'bundle', label: 'Bundle' },
                  ]}
                  onChange={(exportBundle) => onUpdateCapture({ exportBundle })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
              <ToggleRow
                label="Auto-create snapshot after persisted capture"
                description="If a capture returns a persisted reading, create a linked snapshot record automatically."
                checked={settings.capture.autoCreateSnapshot}
                onChange={(autoCreateSnapshot) => onUpdateCapture({ autoCreateSnapshot })}
              />
              <ToggleRow
                label="Suggest baseline after capture"
                description="Prepares the system for baseline-first flows as snapshots and baselines become richer user actions."
                checked={settings.capture.suggestBaselineAfterCapture}
                onChange={(suggestBaselineAfterCapture) => onUpdateCapture({ suggestBaselineAfterCapture })}
              />
            </div>

            <label className="space-y-2">
              <div className="mystic-data-label">Snapshot label template</div>
              <input
                value={settings.capture.snapshotLabelTemplate}
                onChange={(event) => onUpdateCapture({ snapshotLabelTemplate: event.target.value })}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-pip-accent/50"
                placeholder="Captured Analysis — {date} {time}"
              />
              <p className="text-xs text-pip-text-muted">Supported placeholders: <span className="text-pip-text-secondary">{'{date}'}</span> and <span className="text-pip-text-secondary">{'{time}'}</span>.</p>
            </label>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-3 min-h-0">
          <section className="mystic-panel !p-4 flex flex-col gap-4">
            <SectionHeader
              icon={<Cloud className="w-4 h-4" />}
              title="Settings sync state"
              description="Appearance and Capture settings sync to the Selene profile. Runtime stays local to this device."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Remote profile</div>
                <div className="mystic-data-value text-sm">{configuredUserId ? (profileExists === false ? 'Will initialize on save' : 'Available') : 'No user configured'}</div>
              </div>
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Remote settings loaded</div>
                <div className="mystic-data-value text-sm">{remoteSettingsLoaded ? 'Yes' : 'No'}</div>
              </div>
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Last synced at</div>
                <div className="mystic-data-value text-sm">{formatDateTime(lastSyncedAt)}</div>
              </div>
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Sync mode</div>
                <div className="mystic-data-value text-sm">Manual save</div>
              </div>
            </div>

            {syncError ? <p className="mystic-error">{syncError}</p> : null}
          </section>

          <section className="mystic-panel !p-4 flex flex-col gap-4">
            <SectionHeader
              icon={<Database className="w-4 h-4" />}
              title="Live persistence read-state"
              description="This is the relevant backend state we can safely read today while synced settings writes are now backend-mediated."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Current session</div>
                <div className="mystic-data-value text-sm">{currentSession?.status ?? 'Idle'}</div>
                <div className="mt-1 text-xs text-pip-text-secondary break-all">{currentSession?.id ?? 'No active session'}</div>
              </div>
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Active baseline</div>
                <div className="mystic-data-value text-sm">{currentBaseline?.name ?? 'None active'}</div>
                <div className="mt-1 text-xs text-pip-text-secondary break-all">{currentBaseline?.id ?? '—'}</div>
              </div>
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Persisted sessions</div>
                <div className="mystic-data-value text-sm">{sessionsCount}</div>
              </div>
              <div className="mystic-status !p-3">
                <div className="mystic-data-label">Persisted snapshots</div>
                <div className="mystic-data-value text-sm">{snapshotsCount}</div>
              </div>
            </div>
          </section>

          <section className="mystic-panel !p-4 flex flex-col gap-4">
            <SectionHeader
              icon={<Sparkles className="w-4 h-4" />}
              title="Why this split matters"
              description="The sync model matches the platform we are actively building instead of pretending every preference should be global."
            />

            <div className="grid grid-cols-1 gap-3">
              <div className="mystic-status !p-3">
                <div className="mystic-data-value text-sm">Appearance syncs</div>
                <p className="mt-1 text-xs text-pip-text-secondary">Visual stage and layout preferences are stable enough to follow the user across devices.</p>
              </div>
              <div className="mystic-status !p-3">
                <div className="mystic-data-value text-sm">Capture policy syncs</div>
                <p className="mt-1 text-xs text-pip-text-secondary">Snapshot and export defaults are part of the user’s Selemene workflow and belong in the Selene profile.</p>
              </div>
              <div className="mystic-status !p-3">
                <div className="mystic-data-value text-sm">Runtime stays local</div>
                <p className="mt-1 text-xs text-pip-text-secondary">Backend logs, diagnostics, and fallback behavior are tied to this machine and this shell runtime, so they remain device-specific.</p>
              </div>
            </div>
          </section>

          <section className="mystic-panel !p-4 flex flex-col gap-4">
            <SectionHeader
              icon={<SlidersHorizontal className="w-4 h-4" />}
              title="Current profile-backed target"
              description="The synced settings subset now writes through the backend into the Selene profile preferences envelope."
            />

            <div className="rounded-xl border border-dashed border-pip-border/55 bg-black/20 p-3 text-sm text-pip-text-secondary">
              Canonical home: <span className="text-pip-text-primary">public.user_profiles.preferences</span>
              <div className="mt-2 text-xs text-pip-text-muted break-all">Managed namespaces: <span className="text-pip-text-secondary">appearance</span> and <span className="text-pip-text-secondary">capture</span>. Runtime remains local-only.</div>
            </div>

            <div className="mystic-status !p-3 text-sm">
              <div className="mystic-data-label">Last snapshot seen</div>
              <div className="mystic-data-value text-sm break-all">{lastSnapshot?.label ?? lastSnapshot?.id ?? 'No snapshot yet'}</div>
              <div className="mt-1 text-xs text-pip-text-secondary">{formatDateTime(lastSnapshot?.captured_at ?? lastSnapshot?.created_at)}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
