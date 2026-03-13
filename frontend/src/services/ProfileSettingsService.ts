import { ensureBackendReady } from '../utils/runtimeApi';
import type { AppearanceSettings, CaptureExportSettings, ProfileSettingsResponse } from '../types';

class ProfileSettingsService {
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

  async getSettings(userId: string): Promise<ProfileSettingsResponse> {
    return this.fetchJson<ProfileSettingsResponse>(`/api/v1/profile/settings?user_id=${encodeURIComponent(userId)}`);
  }

  async saveSettings(userId: string, payload: {
    appearance: AppearanceSettings;
    capture: CaptureExportSettings;
  }): Promise<ProfileSettingsResponse> {
    return this.fetchJson<ProfileSettingsResponse>('/api/v1/profile/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        user_id: userId,
        appearance: payload.appearance,
        capture: payload.capture,
      }),
    });
  }
}

export const profileSettingsService = new ProfileSettingsService();
