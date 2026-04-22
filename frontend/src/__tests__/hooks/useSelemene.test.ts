import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSelemene } from '../../hooks/useSelemene';
import {
  FALLBACK_SELEMENE_ENGINES,
  FALLBACK_SELEMENE_WORKFLOWS,
} from '../../data/selemeneCatalog';

const mockFetch = vi.fn();

let mockAuthStatus: 'loading' | 'authenticated' | 'unauthenticated' | 'guest' = 'authenticated';
let mockSelemeneToken: string | null = 'selemene-key';

const mockConnectSelemene = vi.fn().mockResolvedValue({ error: null });

vi.mock('../../context/auth/AuthContext', () => ({
  useAuth: () => ({
    status: mockAuthStatus,
    selemeneToken: mockSelemeneToken,
    connectSelemene: mockConnectSelemene,
  }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  } as Response;
}

describe('useSelemene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    mockAuthStatus = 'authenticated';
    mockSelemeneToken = 'selemene-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hydrates the integrated fallback catalog when discovery endpoints fail', async () => {
    mockFetch.mockRejectedValue(new Error('catalog unavailable'));

    const { result } = renderHook(() => useSelemene());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canAccessApi).toBe(true);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.engines).toEqual(FALLBACK_SELEMENE_ENGINES);
    expect(result.current.workflows).toEqual(FALLBACK_SELEMENE_WORKFLOWS);
    expect(result.current.error?.message).toContain('blocked by CORS');
  });

  it('prefers live catalog results when the API returns them', async () => {
    const liveEngines = [{ engine_id: 'transits', engine_name: 'Transits', required_phase: 0 }];
    const liveWorkflows = [{
      workflow_id: 'daily-practice',
      name: 'Daily Practice',
      required_phase: 0,
      engines: ['panchanga', 'vedic-clock', 'biorhythm'],
      description: 'Daily rhythm and awareness tools',
    }];

    mockFetch
      .mockResolvedValueOnce(jsonResponse({ engines: ['transits'] }))
      .mockResolvedValueOnce(jsonResponse({
        workflows: [{ id: 'daily-practice', name: 'Daily Practice', description: 'Daily rhythm and awareness tools', engine_count: 3 }],
      }));

    const { result } = renderHook(() => useSelemene());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.engines).toEqual(liveEngines);
    expect(result.current.workflows).toEqual(liveWorkflows);
  });

  it('uses fallback API key for guests without OAuth token', async () => {
    mockAuthStatus = 'guest';
    mockSelemeneToken = null;
    mockFetch.mockRejectedValue(new Error('catalog unavailable'));

    const { result } = renderHook(() => useSelemene());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Fallback API key ensures guests still have API access
    expect(result.current.canAccessApi).toBe(true);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.engines).toEqual(FALLBACK_SELEMENE_ENGINES);
    expect(result.current.workflows).toEqual(FALLBACK_SELEMENE_WORKFLOWS);
  });
});
