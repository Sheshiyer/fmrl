import { afterEach, describe, expect, it, vi } from 'vitest';
import { getInitialSelemeneCredential } from '../../context/auth/selemeneCredential';

describe('getInitialSelemeneCredential', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers the persisted local storage token over env bootstrap', () => {
    vi.stubEnv('VITE_SELEMENE_API_KEY', 'nk_env_token');
    const storage = {
      getItem: vi.fn((key: string) => key === 'fmrl_selemene_token' ? 'nk_local_token' : null),
    };

    expect(getInitialSelemeneCredential(storage)).toBe('nk_local_token');
  });

  it('falls back to the env bootstrap token when storage is empty', () => {
    vi.stubEnv('VITE_SELEMENE_API_KEY', 'nk_env_token');
    const storage = {
      getItem: vi.fn(() => null),
    };

    expect(getInitialSelemeneCredential(storage)).toBe('nk_env_token');
  });

  it('returns null when neither storage nor env provide a credential', () => {
    const storage = {
      getItem: vi.fn(() => null),
    };

    expect(getInitialSelemeneCredential(storage)).toBeNull();
  });
});
