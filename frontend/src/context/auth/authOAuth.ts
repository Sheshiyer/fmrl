export const USER_ID_STORAGE_KEY = 'biofield_active_user_id';
export const USER_ID_SOURCE_STORAGE_KEY = 'biofield_active_user_id_source';
export const AUTH_MANAGED_USER_ID_SOURCE = 'auth';
export const MANUAL_USER_ID_SOURCE = 'manual';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function resolveAuthRedirectUrl(currentOrigin: string, explicitRedirectUrl?: string | null): string {
  const trimmed = explicitRedirectUrl?.trim();
  if (trimmed) {
    return trimmed;
  }

  return currentOrigin.endsWith('/') ? currentOrigin : `${currentOrigin}/`;
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
