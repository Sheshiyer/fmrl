function normalizeCredential(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function getInitialSelemeneCredential(
  storage: Pick<Storage, 'getItem'> | null | undefined =
    typeof window === 'undefined' ? null : window.localStorage,
): string | null {
  const stored = normalizeCredential(storage?.getItem('fmrl_selemene_token'));
  if (stored) return stored;

  return normalizeCredential(
    typeof import.meta.env.VITE_SELEMENE_API_KEY === 'string'
      ? import.meta.env.VITE_SELEMENE_API_KEY
      : null,
  );
}
