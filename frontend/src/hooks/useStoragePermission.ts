import { useCallback, useEffect, useState } from 'react';

export type StoragePermissionState = 'checking' | 'ready' | 'requires-picker' | 'denied' | 'error';

interface StoragePermissionResult {
  state: StoragePermissionState;
  error: string | null;
  directoryLabel: string | null;
  checkPermission: () => Promise<StoragePermissionState>;
  requestPermission: () => Promise<StoragePermissionState>;
}

const STORAGE_LABEL_KEY = 'selemene_export_directory_label_v1';

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<{ name?: string }>;
};

export function useStoragePermission(): StoragePermissionResult {
  const [state, setState] = useState<StoragePermissionState>('checking');
  const [error, setError] = useState<string | null>(null);
  const [directoryLabel, setDirectoryLabel] = useState<string | null>(null);

  const checkPermission = useCallback(async (): Promise<StoragePermissionState> => {
    try {
      const savedLabel = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_LABEL_KEY) : null;
      if (savedLabel) {
        setState('ready');
        setDirectoryLabel(savedLabel);
        setError(null);
        return 'ready';
      }

      setState('requires-picker');
      setDirectoryLabel(null);
      setError(null);
      return 'requires-picker';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to inspect storage access state.';
      setState('error');
      setError(message);
      return 'error';
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<StoragePermissionState> => {
    try {
      const pickerHost = window as DirectoryPickerWindow;
      if (typeof pickerHost.showDirectoryPicker !== 'function') {
        const fallbackLabel = 'App-managed exports';
        window.localStorage.setItem(STORAGE_LABEL_KEY, fallbackLabel);
        setState('ready');
        setDirectoryLabel(fallbackLabel);
        setError(null);
        return 'ready';
      }

      const handle = await pickerHost.showDirectoryPicker();
      const label = (typeof handle?.name === 'string' && handle.name.trim().length > 0)
        ? handle.name.trim()
        : 'Selected export directory';

      window.localStorage.setItem(STORAGE_LABEL_KEY, label);
      setState('ready');
      setDirectoryLabel(label);
      setError(null);
      return 'ready';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setState('requires-picker');
        setError('Directory selection was cancelled. Pick a folder to continue.');
        return 'requires-picker';
      }

      if (err instanceof DOMException && (err.name === 'SecurityError' || err.name === 'NotAllowedError')) {
        setState('denied');
        setError('Storage access denied. Open system settings and allow file access, then retry.');
        return 'denied';
      }

      const message = err instanceof Error ? err.message : 'Failed to configure export directory.';
      setState('error');
      setError(message);
      return 'error';
    }
  }, []);

  useEffect(() => {
    void checkPermission();
  }, [checkPermission]);

  return {
    state,
    error,
    directoryLabel,
    checkPermission,
    requestPermission,
  };
}
