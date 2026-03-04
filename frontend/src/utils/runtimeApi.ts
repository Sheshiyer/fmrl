import { invoke } from '@tauri-apps/api/core';

interface BackendStatus {
  healthy: boolean;
  running: boolean;
  url: string;
  message?: string;
}

interface BackendReadiness {
  ready: boolean;
  baseUrl: string;
  error?: string;
}

export type ComputeRoute = 'python' | 'rust';

export interface RuntimeParityStatus {
  route: ComputeRoute;
  rustSignoff: boolean;
  parityGateApproved: boolean;
  reason: string;
}

interface BackendLogsResult {
  supported: boolean;
  logs: string[];
  error?: string;
}

const WEB_FALLBACK_URL: string =
  typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL.trim().length > 0
    ? import.meta.env.VITE_API_URL
    : 'http://localhost:8000';

export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    return await invoke<T>(command, args);
  } catch {
    return null;
  }
}

let cachedBaseUrl: string | undefined;

async function resolveDesktopBackendStatus(): Promise<BackendStatus | null> {
  const health = await invokeTauri<BackendStatus>('backend_health');
  if (health?.healthy && health.url) {
    return health;
  }

  const started = await invokeTauri<BackendStatus>('start_backend');
  if (started?.url) {
    return started;
  }

  return started ?? health ?? null;
}

export async function getRuntimeApiBaseUrl(): Promise<string> {
  if (cachedBaseUrl !== undefined) return cachedBaseUrl;

  if (!isTauriRuntime()) {
    cachedBaseUrl = WEB_FALLBACK_URL;
    return cachedBaseUrl;
  }

  const status = await resolveDesktopBackendStatus();
  if (status?.url && status.healthy) {
    cachedBaseUrl = status.url;
    return cachedBaseUrl;
  }

  return WEB_FALLBACK_URL;
}

export async function ensureBackendReady(timeoutMs = 2500): Promise<BackendReadiness> {
  const desktopRuntime = isTauriRuntime();

  let statusMessage: string | undefined;
  let baseUrl = WEB_FALLBACK_URL;

  if (desktopRuntime) {
    const status = await resolveDesktopBackendStatus();
    if (status?.url) {
      baseUrl = status.url;
    }

    if (!status) {
      statusMessage = 'Desktop command bridge is unavailable. Restart the app bundle and retry.';
    } else if (!status.healthy) {
      statusMessage = status.message ?? 'Desktop backend is not healthy yet.';
    }
  } else {
    baseUrl = await getRuntimeApiBaseUrl();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        ready: false,
        baseUrl,
        error: `Backend health check failed (${res.status})`,
      };
    }

    cachedBaseUrl = baseUrl;
    return { ready: true, baseUrl };
  } catch (error) {
    const networkMessage = error instanceof Error ? error.message : 'Backend is not reachable';
    const combined = statusMessage ? `${statusMessage} (${networkMessage})` : networkMessage;
    return { ready: false, baseUrl, error: combined };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getBackendLogs(limit = 120): Promise<BackendLogsResult> {
  if (!isTauriRuntime()) {
    return {
      supported: false,
      logs: [],
      error: 'Backend logs are available only in Tauri desktop runtime.',
    };
  }

  const logs = await invokeTauri<string[]>('backend_logs', { limit });
  if (Array.isArray(logs)) {
    return {
      supported: true,
      logs,
    };
  }

  return {
    supported: true,
    logs: [],
    error: 'Failed to fetch backend logs from Tauri runtime.',
  };
}

function toWebSocketUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const parsed = new URL(baseUrl);
  parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  parsed.pathname = normalizedPath;
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

export async function getRuntimeWebSocketUrl(path = '/ws/v1/metrics'): Promise<string> {
  const baseUrl = await getRuntimeApiBaseUrl();
  return toWebSocketUrl(baseUrl, path);
}

export type NativeSettingsTarget = 'camera' | 'storage';

export async function openNativeSettings(target: NativeSettingsTarget): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false;
  }

  try {
    const opened = await invoke<boolean>('open_app_settings', { target });
    return opened === true;
  } catch (error) {
    const message = error instanceof Error ? error.message : `Failed to open native settings for ${target}.`;
    throw new Error(message);
  }
}

export async function openCameraPrivacySettings(): Promise<boolean> {
  return openNativeSettings('camera');
}

export async function repairCameraPermissionState(): Promise<string> {
  if (!isTauriRuntime()) {
    return 'Permission repair is available only in desktop runtime.';
  }

  try {
    return await invoke<string>('repair_camera_permission_state');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run permission repair.';
    throw new Error(message);
  }
}
