/**
 * Tauri Native Features Hook
 * Provides access to native desktop capabilities
 */
import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime, openNativeSettings } from '../utils/runtimeApi';

// Window control types
interface WindowState {
  isMaximized: boolean;
  isMinimized: boolean;
  isFullscreen: boolean;
}

// Native notification options
interface NativeNotificationOptions {
  title: string;
  body: string;
  icon?: string;
}

export function useTauriNative() {
  const [isAvailable] = useState(() => isTauriRuntime());
  const [windowState, setWindowState] = useState<WindowState>({
    isMaximized: false,
    isMinimized: false,
    isFullscreen: false,
  });

  // Window controls
  const minimizeWindow = useCallback(async () => {
    if (!isAvailable) return;
    try {
      await invoke('minimize_window');
    } catch (err) {
      console.error('Failed to minimize window:', err);
    }
  }, [isAvailable]);

  const maximizeWindow = useCallback(async () => {
    if (!isAvailable) return;
    try {
      await invoke('maximize_window');
      setWindowState(prev => ({ ...prev, isMaximized: true }));
    } catch (err) {
      console.error('Failed to maximize window:', err);
    }
  }, [isAvailable]);

  const unmaximizeWindow = useCallback(async () => {
    if (!isAvailable) return;
    try {
      await invoke('unmaximize_window');
      setWindowState(prev => ({ ...prev, isMaximized: false }));
    } catch (err) {
      console.error('Failed to unmaximize window:', err);
    }
  }, [isAvailable]);

  const toggleMaximize = useCallback(async () => {
    if (windowState.isMaximized) {
      await unmaximizeWindow();
    } else {
      await maximizeWindow();
    }
  }, [windowState.isMaximized, maximizeWindow, unmaximizeWindow]);

  const closeWindow = useCallback(async () => {
    if (!isAvailable) return;
    try {
      await invoke('close_window');
    } catch (err) {
      console.error('Failed to close window:', err);
    }
  }, [isAvailable]);

  // Fullscreen control
  const setFullscreen = useCallback(async (fullscreen: boolean) => {
    if (!isAvailable) {
      // Web fallback
      if (fullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
      return;
    }
    try {
      await invoke('set_fullscreen', { fullscreen });
      setWindowState(prev => ({ ...prev, isFullscreen: fullscreen }));
    } catch (err) {
      console.error('Failed to set fullscreen:', err);
    }
  }, [isAvailable]);

  const toggleFullscreen = useCallback(async () => {
    await setFullscreen(!windowState.isFullscreen);
  }, [windowState.isFullscreen, setFullscreen]);

  // Native settings
  const openCameraSettings = useCallback(async () => {
    return openNativeSettings('camera');
  }, []);

  const openStorageSettings = useCallback(async () => {
    return openNativeSettings('storage');
  }, []);

  // Native notifications
  const showNotification = useCallback(async (options: NativeNotificationOptions) => {
    if (!isAvailable) {
      // Web fallback
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(options.title, { body: options.body });
      }
      return;
    }
    try {
      await invoke('show_notification', { 
        title: options.title, 
        body: options.body,
        icon: options.icon,
      });
    } catch (err) {
      console.error('Failed to show notification:', err);
    }
  }, [isAvailable]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!isAvailable) {
      if ('Notification' in window) {
        return await Notification.requestPermission();
      }
      return 'denied' as const;
    }
    try {
      return await invoke<string>('request_notification_permission');
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      return 'denied' as const;
    }
  }, [isAvailable]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    if (!isAvailable) {
      // Web fallback
      await navigator.clipboard.writeText(text);
      return;
    }
    try {
      await invoke('copy_to_clipboard', { text });
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback
      await navigator.clipboard.writeText(text);
    }
  }, [isAvailable]);

  // Save file dialog
  const saveFile = useCallback(async (data: string, filename: string) => {
    if (!isAvailable) {
      // Web fallback - trigger download
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
    try {
      return await invoke<boolean>('save_file', { data, filename });
    } catch (err) {
      console.error('Failed to save file:', err);
      return false;
    }
  }, [isAvailable]);

  // App version
  const [appVersion, setAppVersion] = useState<string>('1.0.0');
  useEffect(() => {
    if (!isAvailable) return;
    invoke<string>('get_app_version')
      .then(setAppVersion)
      .catch(console.error);
  }, [isAvailable]);

  return {
    isAvailable,
    windowState,
    appVersion,
    minimizeWindow,
    maximizeWindow,
    unmaximizeWindow,
    toggleMaximize,
    closeWindow,
    setFullscreen,
    toggleFullscreen,
    openCameraSettings,
    openStorageSettings,
    showNotification,
    requestNotificationPermission,
    copyToClipboard,
    saveFile,
  };
}

// Haptic feedback hook (iOS-style)
export function useHaptic() {
  const [isSupported] = useState(() => {
    return 'vibrate' in navigator || isTauriRuntime();
  });

  const light = useCallback(() => {
    if (isTauriRuntime()) {
      invoke('haptic_light').catch(() => {});
    } else if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const medium = useCallback(() => {
    if (isTauriRuntime()) {
      invoke('haptic_medium').catch(() => {});
    } else if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  }, []);

  const heavy = useCallback(() => {
    if (isTauriRuntime()) {
      invoke('haptic_heavy').catch(() => {});
    } else if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, []);

  return {
    isSupported,
    light,
    medium,
    heavy,
  };
}
