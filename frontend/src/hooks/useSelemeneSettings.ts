import { useCallback, useEffect, useMemo, useState } from 'react';
import { profileSettingsService } from '../services/ProfileSettingsService';
import type {
  AppearanceSettings,
  SelemeneSettingsPreferences,
  CaptureExportSettings,
  RuntimeSettings,
  SettingsSyncState,
  SyncedSelemeneSettings,
} from '../types';

const SETTINGS_STORAGE_KEY = 'selemene_settings_v1';

export const defaultSelemeneSettings: SelemeneSettingsPreferences = {
  appearance: {
    themeMode: 'sacred-dark',
    workspaceDensity: 'balanced',
    motionLevel: 'reduced',
    accentProfile: 'gold',
    showOverlayLegend: true,
    showStageSignals: true,
  },
  runtime: {
    showBackendLogs: true,
    showDiagnosticsSummary: true,
    autoFallbackToPreview: true,
    enableBackendCapture: true,
  },
  capture: {
    defaultAnalysisRegion: 'full',
    autoCreateSnapshot: true,
    suggestBaselineAfterCapture: true,
    exportBundle: 'bundle',
    snapshotLabelTemplate: 'Captured Analysis — {date} {time}',
  },
};

function mergeSettings(candidate?: Partial<SelemeneSettingsPreferences> | null): SelemeneSettingsPreferences {
  return {
    appearance: {
      ...defaultSelemeneSettings.appearance,
      ...(candidate?.appearance ?? {}),
    },
    runtime: {
      ...defaultSelemeneSettings.runtime,
      ...(candidate?.runtime ?? {}),
    },
    capture: {
      ...defaultSelemeneSettings.capture,
      ...(candidate?.capture ?? {}),
    },
  };
}

function mergeRemoteSettings(current: SelemeneSettingsPreferences, remote?: SyncedSelemeneSettings | null): SelemeneSettingsPreferences {
  if (!remote) return current;
  return {
    ...current,
    appearance: {
      ...current.appearance,
      ...(remote.appearance ?? {}),
    },
    capture: {
      ...current.capture,
      ...(remote.capture ?? {}),
    },
  };
}

function readStoredSettings(): SelemeneSettingsPreferences {
  if (typeof window === 'undefined') return defaultSelemeneSettings;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultSelemeneSettings;
    return mergeSettings(JSON.parse(raw) as Partial<SelemeneSettingsPreferences>);
  } catch {
    return defaultSelemeneSettings;
  }
}

interface UseSelemeneSettingsOptions {
  configuredUserId?: string | null;
}

export function useSelemeneSettings({ configuredUserId }: UseSelemeneSettingsOptions = {}) {
  const [settings, setSettings] = useState<SelemeneSettingsPreferences>(() => readStoredSettings());
  const [syncState, setSyncState] = useState<SettingsSyncState>({
    remoteSettingsLoaded: false,
    isLoadingRemoteSettings: false,
    isSavingRemoteSettings: false,
    lastSyncedAt: null,
    syncError: null,
    profileExists: undefined,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.selemeneTheme = settings.appearance.themeMode;
    root.dataset.selemeneDensity = settings.appearance.workspaceDensity;
    root.dataset.selemeneMotion = settings.appearance.motionLevel;
    root.dataset.selemeneAccent = settings.appearance.accentProfile;
  }, [settings]);

  const updateAppearance = useCallback((patch: Partial<AppearanceSettings>) => {
    setSettings((current) => ({
      ...current,
      appearance: {
        ...current.appearance,
        ...patch,
      },
    }));
  }, []);

  const updateRuntime = useCallback((patch: Partial<RuntimeSettings>) => {
    setSettings((current) => ({
      ...current,
      runtime: {
        ...current.runtime,
        ...patch,
      },
    }));
  }, []);

  const updateCapture = useCallback((patch: Partial<CaptureExportSettings>) => {
    setSettings((current) => ({
      ...current,
      capture: {
        ...current.capture,
        ...patch,
      },
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSelemeneSettings);
    setSyncState((current) => ({
      ...current,
      syncError: null,
    }));
  }, []);

  const reloadRemoteSettings = useCallback(async () => {
    if (!configuredUserId) {
      setSyncState((current) => ({
        ...current,
        remoteSettingsLoaded: false,
        isLoadingRemoteSettings: false,
        syncError: null,
        profileExists: undefined,
      }));
      return null;
    }

    setSyncState((current) => ({
      ...current,
      isLoadingRemoteSettings: true,
      syncError: null,
    }));

    try {
      const response = await profileSettingsService.getSettings(configuredUserId);
      setSettings((current) => mergeRemoteSettings(current, response.settings));
      setSyncState((current) => ({
        ...current,
        remoteSettingsLoaded: true,
        isLoadingRemoteSettings: false,
        lastSyncedAt: response.updated_at ?? current.lastSyncedAt ?? null,
        syncError: null,
        profileExists: response.profile_exists,
      }));
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load synced settings';
      setSyncState((current) => ({
        ...current,
        remoteSettingsLoaded: false,
        isLoadingRemoteSettings: false,
        syncError: message,
      }));
      return null;
    }
  }, [configuredUserId]);

  const saveRemoteSettings = useCallback(async () => {
    if (!configuredUserId) {
      setSyncState((current) => ({
        ...current,
        syncError: 'Configure a Selene user ID before saving synced settings.',
      }));
      return null;
    }

    setSyncState((current) => ({
      ...current,
      isSavingRemoteSettings: true,
      syncError: null,
    }));

    try {
      const response = await profileSettingsService.saveSettings(configuredUserId, {
        appearance: settings.appearance,
        capture: settings.capture,
      });
      setSettings((current) => mergeRemoteSettings(current, response.settings));
      setSyncState((current) => ({
        ...current,
        remoteSettingsLoaded: true,
        isSavingRemoteSettings: false,
        lastSyncedAt: response.updated_at ?? new Date().toISOString(),
        syncError: null,
        profileExists: response.profile_exists,
      }));
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save synced settings';
      setSyncState((current) => ({
        ...current,
        isSavingRemoteSettings: false,
        syncError: message,
      }));
      return null;
    }
  }, [configuredUserId, settings.appearance, settings.capture]);

  useEffect(() => {
    void reloadRemoteSettings();
  }, [reloadRemoteSettings]);

  return useMemo(() => ({
    settings,
    updateAppearance,
    updateRuntime,
    updateCapture,
    resetSettings,
    reloadRemoteSettings,
    saveRemoteSettings,
    ...syncState,
  }), [
    reloadRemoteSettings,
    resetSettings,
    saveRemoteSettings,
    settings,
    syncState,
    updateAppearance,
    updateCapture,
    updateRuntime,
  ]);
}
