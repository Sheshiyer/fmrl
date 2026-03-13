import { useCallback, useEffect, useMemo, useState } from 'react';
import { profileSettingsService } from '../services/ProfileSettingsService';
import type {
  AppearanceSettings,
  BiofieldSettingsPreferences,
  CaptureExportSettings,
  RuntimeSettings,
  SettingsSyncState,
  SyncedBiofieldSettings,
} from '../types';

const SETTINGS_STORAGE_KEY = 'biofield_settings_v1';

export const defaultBiofieldSettings: BiofieldSettingsPreferences = {
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

function mergeSettings(candidate?: Partial<BiofieldSettingsPreferences> | null): BiofieldSettingsPreferences {
  return {
    appearance: {
      ...defaultBiofieldSettings.appearance,
      ...(candidate?.appearance ?? {}),
    },
    runtime: {
      ...defaultBiofieldSettings.runtime,
      ...(candidate?.runtime ?? {}),
    },
    capture: {
      ...defaultBiofieldSettings.capture,
      ...(candidate?.capture ?? {}),
    },
  };
}

function mergeRemoteSettings(current: BiofieldSettingsPreferences, remote?: SyncedBiofieldSettings | null): BiofieldSettingsPreferences {
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

function readStoredSettings(): BiofieldSettingsPreferences {
  if (typeof window === 'undefined') return defaultBiofieldSettings;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultBiofieldSettings;
    return mergeSettings(JSON.parse(raw) as Partial<BiofieldSettingsPreferences>);
  } catch {
    return defaultBiofieldSettings;
  }
}

interface UseBiofieldSettingsOptions {
  configuredUserId?: string | null;
}

export function useBiofieldSettings({ configuredUserId }: UseBiofieldSettingsOptions = {}) {
  const [settings, setSettings] = useState<BiofieldSettingsPreferences>(() => readStoredSettings());
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
    root.dataset.biofieldTheme = settings.appearance.themeMode;
    root.dataset.biofieldDensity = settings.appearance.workspaceDensity;
    root.dataset.biofieldMotion = settings.appearance.motionLevel;
    root.dataset.biofieldAccent = settings.appearance.accentProfile;
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
    setSettings(defaultBiofieldSettings);
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
