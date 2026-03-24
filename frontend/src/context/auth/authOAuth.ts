export const USER_ID_STORAGE_KEY = 'selemene_active_user_id';
export const USER_ID_SOURCE_STORAGE_KEY = 'selemene_active_user_id_source';
export const AUTH_MANAGED_USER_ID_SOURCE = 'auth';
export const MANUAL_USER_ID_SOURCE = 'manual';

/** Deep-link scheme used by the Tauri desktop app. */
export const DEEP_LINK_SCHEME = 'fmrl';
export const DEEP_LINK_AUTH_CALLBACK = `${DEEP_LINK_SCHEME}://auth/callback`;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function resolveAuthRedirectUrl(currentOrigin: string, explicitRedirectUrl?: string | null): string {
  const trimmed = explicitRedirectUrl?.trim();
  if (trimmed) {
    return trimmed;
  }

  return currentOrigin.endsWith('/') ? currentOrigin : `${currentOrigin}/`;
}

/**
 * Parse OAuth tokens from a deep-link callback URL.
 * Supabase implicit flow appends tokens as a hash fragment:
 *   fmrl://auth/callback#access_token=...&refresh_token=...
 * Also supports query params as fallback (e.g. PKCE flow or intermediary redirect).
 */
export function parseDeepLinkTokens(url: string): { access_token: string; refresh_token: string } | null {
  try {
    // Try query params first (more reliable across OS URL handlers)
    const qIdx = url.indexOf('?');
    if (qIdx !== -1) {
      const queryStr = url.slice(qIdx + 1).split('#')[0];
      const qParams = new URLSearchParams(queryStr);
      const qAccess = qParams.get('access_token');
      const qRefresh = qParams.get('refresh_token');
      if (qAccess && qRefresh) return { access_token: qAccess, refresh_token: qRefresh };
    }
    // Fallback: hash fragment (standard implicit flow)
    const hashIdx = url.indexOf('#');
    if (hashIdx === -1) return null;
    const fragment = url.slice(hashIdx + 1);
    const params = new URLSearchParams(fragment);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return null;
    return { access_token, refresh_token };
  } catch {
    return null;
  }
}

export function setManualPersistenceUserId(storage: StorageLike, userId: string): void {
  storage.setItem(USER_ID_STORAGE_KEY, userId.trim());
  storage.setItem(USER_ID_SOURCE_STORAGE_KEY, MANUAL_USER_ID_SOURCE);
}

export function syncAuthManagedPersistenceUserId(storage: StorageLike, userId: string): void {
  storage.setItem(USER_ID_STORAGE_KEY, userId.trim());
  storage.setItem(USER_ID_SOURCE_STORAGE_KEY, AUTH_MANAGED_USER_ID_SOURCE);
}

export function clearPersistenceUserId(storage: StorageLike): void {
  storage.removeItem(USER_ID_STORAGE_KEY);
  storage.removeItem(USER_ID_SOURCE_STORAGE_KEY);
}

export function clearAuthManagedPersistenceUserId(storage: StorageLike): void {
  if (storage.getItem(USER_ID_SOURCE_STORAGE_KEY) !== AUTH_MANAGED_USER_ID_SOURCE) {
    return;
  }

  clearPersistenceUserId(storage);
}
