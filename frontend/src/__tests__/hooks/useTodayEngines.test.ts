import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTodayEngines } from '../../hooks/useTodayEngines';
import { SelemeneApiError } from '../../services/SelemeneClient';

const mockCalculate = vi.fn();
const mockClient = { calculate: mockCalculate, setToken: vi.fn() };
const mockBirthData = {
  date: '1990-01-01',
  time: '06:30',
  latitude: 28.6139,
  longitude: 77.209,
  timezone: 'Asia/Kolkata',
};
const mockAppState = {
  state: {
    birthData: mockBirthData,
  },
};

let mockCanAccessApi = true;
// Default passthrough — tests can override via mockWithAuthRecovery
const mockWithAuthRecovery = vi.fn(<T,>(fn: () => Promise<T>) => fn());

vi.mock('../../hooks/useSelemene', () => ({
  useSelemene: () => ({
    client: mockClient,
    canAccessApi: mockCanAccessApi,
    isConnected: mockCanAccessApi,
    withAuthRecovery: mockWithAuthRecovery,
    engines: [],
    workflows: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../context/appState', () => ({
  useAppState: () => mockAppState,
}));

describe('useTodayEngines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanAccessApi = true;
    // Reset to passthrough
    mockWithAuthRecovery.mockImplementation(<T,>(fn: () => Promise<T>) => fn());
  });

  it('surfaces a panchanga-specific error when other engines succeed', async () => {
    mockCalculate
      .mockRejectedValueOnce(new Error('Panchanga unavailable'))
      .mockResolvedValueOnce({ engine_id: 'vedic-clock', result: { hora: 'Sun' } })
      .mockResolvedValueOnce({ engine_id: 'biorhythm', result: { physical: 0.3 } })
      .mockResolvedValueOnce({ engine_id: 'numerology', result: { personal_day: 9 } });

    const { result, unmount } = renderHook(() => useTodayEngines());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCalculate).toHaveBeenCalledTimes(4);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Panchanga unavailable');
    expect(result.current.vedicClock).toBeTruthy();
    expect(result.current.biorhythm).toBeTruthy();
    expect(result.current.numerology).toBeTruthy();

    unmount();
  });

  it('surfaces an error when every timing-engine request fails', async () => {
    mockCalculate.mockRejectedValue(new Error('Selemene timing request failed'));

    const { result, unmount } = renderHook(() => useTodayEngines());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockCalculate).toHaveBeenCalledTimes(4);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Selemene timing request failed');
    expect(result.current.panchanga).toBeNull();
    expect(result.current.vedicClock).toBeNull();
    expect(result.current.biorhythm).toBeNull();
    expect(result.current.numerology).toBeNull();

    unmount();
  });

  it('delegates JWT recovery to withAuthRecovery from useSelemene', async () => {
    const expiredTokenError = new SelemeneApiError(
      { error: 'Invalid or expired JWT token', error_code: 'AUTH_REQUIRED' },
      401,
    );

    // Simulate withAuthRecovery: first call to fn() throws 401, second call succeeds
    let recoveryAttempts = 0;
    mockWithAuthRecovery.mockImplementation(async <T,>(fn: () => Promise<T>) => {
      try {
        return await fn();
      } catch (err) {
        if (
          err instanceof SelemeneApiError &&
          err.statusCode === 401 &&
          recoveryAttempts === 0
        ) {
          recoveryAttempts++;
          return fn();
        }
        throw err;
      }
    });

    mockCalculate
      // First round: panchanga fails with 401
      .mockRejectedValueOnce(expiredTokenError)
      // Recovery retry for panchanga
      .mockResolvedValueOnce({ engine_id: 'panchanga', result: { tithi: 'Shukla Dashami' } })
      // Other engines succeed on first try
      .mockResolvedValueOnce({ engine_id: 'vedic-clock', result: { hora: 'Sun' } })
      .mockResolvedValueOnce({ engine_id: 'biorhythm', result: { physical: 0.3 } })
      .mockResolvedValueOnce({ engine_id: 'numerology', result: { personal_day: 9 } });

    const { result, unmount } = renderHook(() => useTodayEngines());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // withAuthRecovery was called for all 4 engines
    expect(mockWithAuthRecovery).toHaveBeenCalledTimes(4);
    // Panchanga was retried (2 calculate calls) + 3 others = 5
    expect(mockCalculate).toHaveBeenCalledTimes(5);
    expect(result.current.error).toBeNull();
    expect(result.current.panchanga).toBeTruthy();

    unmount();
  });
});
