/**
 * Settings Page Wrapper
 * Preserves all settings functionality and persistence integration
 */

import { SettingsPage } from './SettingsPage';
import { useSelemenePersistence } from '../hooks/useSelemenePersistence';
import { useSelemeneSettings } from '../hooks/useSelemeneSettings';
import { FadeIn } from '../components/Animations';

export function SettingsPageWrapper() {
  const persistence = useSelemenePersistence({
    active: true,
  });

  const {
    settings,
    updateAppearance,
    updateRuntime,
    updateCapture,
    resetSettings,
    reloadRemoteSettings,
    saveRemoteSettings,
    remoteSettingsLoaded,
    isLoadingRemoteSettings,
    isSavingRemoteSettings,
    lastSyncedAt,
    syncError,
    profileExists,
  } = useSelemeneSettings({
    configuredUserId: persistence.configuredUserId,
  });

  return (
    <FadeIn className="h-full overflow-auto">
      <SettingsPage
        settings={settings}
        backendConnected={persistence.healthy}
        persistenceEnabled={persistence.enabled}
        persistenceHealthy={persistence.healthy}
        configuredUserId={persistence.configuredUserId ?? null}
        currentSession={persistence.session}
        currentBaseline={persistence.currentBaseline}
        sessionsCount={persistence.sessions.length}
        snapshotsCount={persistence.snapshots.length}
        lastSnapshot={persistence.lastSnapshot ?? persistence.snapshots[0] ?? null}
        remoteSettingsLoaded={remoteSettingsLoaded}
        isLoadingRemoteSettings={isLoadingRemoteSettings}
        isSavingRemoteSettings={isSavingRemoteSettings}
        lastSyncedAt={lastSyncedAt}
        syncError={syncError}
        profileExists={profileExists}
        onReloadRemoteSettings={() => void reloadRemoteSettings()}
        onSaveRemoteSettings={() => void saveRemoteSettings()}
        onUpdateAppearance={updateAppearance}
        onUpdateRuntime={updateRuntime}
        onUpdateCapture={updateCapture}
        onReset={resetSettings}
      />
    </FadeIn>
  );
}
