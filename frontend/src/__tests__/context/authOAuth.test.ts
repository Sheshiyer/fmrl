import { describe, expect, it, vi } from 'vitest';
import {
  AUTH_MANAGED_USER_ID_SOURCE,
  USER_ID_SOURCE_STORAGE_KEY,
  USER_ID_STORAGE_KEY,
  clearAuthManagedPersistenceUserId,
  resolveAuthRedirectUrl,
  syncAuthManagedPersistenceUserId,
} from '../../context/auth/authOAuth';

function createStorageMock(initialSource: string | null = null) {
  const data = new Map<string, string>();
  if (initialSource) {
    data.set(USER_ID_SOURCE_STORAGE_KEY, initialSource);
  }

  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
  };
}

describe('authOAuth', () => {
  describe('resolveAuthRedirectUrl', () => {
    it('uses explicit redirect URL when provided', () => {
      expect(resolveAuthRedirectUrl('http://localhost:5173', ' https://tauri.localhost/ ')).toBe(
        'https://tauri.localhost/',
      );
    });

    it('falls back to the current origin when no explicit redirect URL is configured', () => {
      expect(resolveAuthRedirectUrl('http://localhost:5173', '')).toBe('http://localhost:5173/');
    });

    it('normalizes the bundled desktop localhost origin when no explicit redirect URL is configured', () => {
      expect(resolveAuthRedirectUrl('https://tauri.localhost', undefined)).toBe(
        'https://tauri.localhost/',
      );
    });
  });

  describe('auth-managed persistence identity', () => {
    it('stores the authenticated user id and marks it as auth-managed', () => {
      const storage = createStorageMock();

      syncAuthManagedPersistenceUserId(storage, 'discord-user-123');

      expect(storage.setItem).toHaveBeenCalledWith(USER_ID_STORAGE_KEY, 'discord-user-123');
      expect(storage.setItem).toHaveBeenCalledWith(
        USER_ID_SOURCE_STORAGE_KEY,
        AUTH_MANAGED_USER_ID_SOURCE,
      );
    });

    it('clears auth-managed identity on sign-out', () => {
      const storage = createStorageMock(AUTH_MANAGED_USER_ID_SOURCE);

      clearAuthManagedPersistenceUserId(storage);

      expect(storage.removeItem).toHaveBeenCalledWith(USER_ID_STORAGE_KEY);
      expect(storage.removeItem).toHaveBeenCalledWith(USER_ID_SOURCE_STORAGE_KEY);
    });

    it('does not clear a manually configured persistence identity', () => {
      const storage = createStorageMock('manual');

      clearAuthManagedPersistenceUserId(storage);

      expect(storage.removeItem).not.toHaveBeenCalledWith(USER_ID_STORAGE_KEY);
      expect(storage.removeItem).not.toHaveBeenCalledWith(USER_ID_SOURCE_STORAGE_KEY);
    });
  });
});
