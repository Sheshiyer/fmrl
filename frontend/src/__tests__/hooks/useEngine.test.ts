import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEngine } from '../../hooks/useEngine';

/**
 * TDD Tests for useEngine hook
 * RED phase -- all tests written before implementation verification
 */

const mockCalculate = vi.fn();
const mockClient = { calculate: mockCalculate };
let mockIsConnected = true;

vi.mock('../../hooks/useSelemene', () => ({
  useSelemene: () => ({
    client: mockClient,
    get isConnected() { return mockIsConnected; },
    engines: [],
    workflows: [],
    isLoading: false,
    error: null,
  }),
}));

describe('useEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConnected = true;
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useEngine('biorhythm'));
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isConnected).toBe(true);
    expect(typeof result.current.calculate).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  describe('calculate()', () => {
    it('returns result and sets result state', async () => {
      const mockOutput = { engine: 'biorhythm', data: { physical: 0.8 } };
      mockCalculate.mockResolvedValueOnce(mockOutput);

      const { result } = renderHook(() => useEngine('biorhythm'));

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.calculate({ birthDate: '1990-01-01' });
      });

      expect(returnValue).toEqual(mockOutput);
      expect(result.current.result).toEqual(mockOutput);
      expect(mockCalculate).toHaveBeenCalledWith('biorhythm', { birthDate: '1990-01-01' });
    });

    it('sets isLoading during execution', async () => {
      let resolvePromise: (v: unknown) => void;
      const pending = new Promise((resolve) => { resolvePromise = resolve; });
      mockCalculate.mockReturnValueOnce(pending);

      const { result } = renderHook(() => useEngine('biorhythm'));

      expect(result.current.isLoading).toBe(false);

      let calculatePromise: Promise<unknown>;
      act(() => {
        calculatePromise = result.current.calculate({ birthDate: '1990-01-01' });
      });

      // isLoading should be true while awaiting
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ engine: 'biorhythm', data: {} });
        await calculatePromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      const testError = new Error('Engine calculation failed');
      mockCalculate.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useEngine('biorhythm'));

      await act(async () => {
        const returnValue = await result.current.calculate({ birthDate: '1990-01-01' });
        expect(returnValue).toBeNull();
      });

      expect(result.current.error).toEqual(testError);
      expect(result.current.result).toBeNull();
    });

    it('wraps non-Error thrown values in Error', async () => {
      mockCalculate.mockRejectedValueOnce('string error');

      const { result } = renderHook(() => useEngine('biorhythm'));

      await act(async () => {
        await result.current.calculate({ birthDate: '1990-01-01' });
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error!.message).toBe('string error');
    });

    it('returns null when not connected', async () => {
      mockIsConnected = false;

      const { result } = renderHook(() => useEngine('biorhythm'));

      await act(async () => {
        const returnValue = await result.current.calculate({ birthDate: '1990-01-01' });
        expect(returnValue).toBeNull();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error!.message).toBe('Not connected to Selemene API');
      expect(mockCalculate).not.toHaveBeenCalled();
    });
  });

  describe('reset()', () => {
    it('clears result and error', async () => {
      const mockOutput = { engine: 'biorhythm', data: { physical: 0.8 } };
      mockCalculate.mockResolvedValueOnce(mockOutput);

      const { result } = renderHook(() => useEngine('biorhythm'));

      await act(async () => {
        await result.current.calculate({ birthDate: '1990-01-01' });
      });

      expect(result.current.result).toEqual(mockOutput);

      act(() => {
        result.current.reset();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
