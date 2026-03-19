import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkflow } from '../../hooks/useWorkflow';
import { SelemeneApiError } from '../../services/SelemeneClient';

/**
 * TDD Tests for useWorkflow hook
 * RED phase -- all tests written before implementation verification
 */

const mockExecuteWorkflow = vi.fn();
const mockClient = { executeWorkflow: mockExecuteWorkflow };
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

describe('useWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConnected = true;
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useWorkflow());
    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isPhaseGated).toBe(false);
    expect(typeof result.current.execute).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  describe('execute()', () => {
    it('returns result and sets result state', async () => {
      const mockOutput = {
        workflowId: 'daily-synthesis',
        steps: [{ engine: 'biorhythm', data: { physical: 0.8 } }],
      };
      mockExecuteWorkflow.mockResolvedValueOnce(mockOutput);

      const { result } = renderHook(() => useWorkflow());

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.execute('daily-synthesis', { birthDate: '1990-01-01' });
      });

      expect(returnValue).toEqual(mockOutput);
      expect(result.current.result).toEqual(mockOutput);
      expect(mockExecuteWorkflow).toHaveBeenCalledWith('daily-synthesis', { birthDate: '1990-01-01' });
    });

    it('sets isLoading during execution', async () => {
      let resolvePromise: (v: unknown) => void;
      const pending = new Promise((resolve) => { resolvePromise = resolve; });
      mockExecuteWorkflow.mockReturnValueOnce(pending);

      const { result } = renderHook(() => useWorkflow());

      expect(result.current.isLoading).toBe(false);

      let executePromise: Promise<unknown>;
      act(() => {
        executePromise = result.current.execute('daily-synthesis', { birthDate: '1990-01-01' });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ workflowId: 'daily-synthesis', steps: [] });
        await executePromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      const testError = new Error('Workflow execution failed');
      mockExecuteWorkflow.mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        const returnValue = await result.current.execute('daily-synthesis', { birthDate: '1990-01-01' });
        expect(returnValue).toBeNull();
      });

      expect(result.current.error).toEqual(testError);
      expect(result.current.result).toBeNull();
    });

    it('sets isPhaseGated when SelemeneApiError.isPhaseAccessDenied', async () => {
      const phaseError = new SelemeneApiError(
        { error: 'Phase access denied', error_code: 'PHASE_ACCESS_DENIED' },
        403,
      );
      mockExecuteWorkflow.mockRejectedValueOnce(phaseError);

      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        const returnValue = await result.current.execute('advanced-workflow', { birthDate: '1990-01-01' });
        expect(returnValue).toBeNull();
      });

      expect(result.current.isPhaseGated).toBe(true);
      expect(result.current.error).toEqual(phaseError);
    });

    it('does not set isPhaseGated for non-phase errors', async () => {
      const regularApiError = new SelemeneApiError(
        { error: 'Internal error', error_code: 'INTERNAL_ERROR' },
        500,
      );
      mockExecuteWorkflow.mockRejectedValueOnce(regularApiError);

      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.execute('daily-synthesis', { birthDate: '1990-01-01' });
      });

      expect(result.current.isPhaseGated).toBe(false);
      expect(result.current.error).toEqual(regularApiError);
    });

    it('returns null when not connected', async () => {
      mockIsConnected = false;

      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        const returnValue = await result.current.execute('daily-synthesis', { birthDate: '1990-01-01' });
        expect(returnValue).toBeNull();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error!.message).toBe('Not connected to Selemene Engine');
      expect(mockExecuteWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('reset()', () => {
    it('clears result, error, and isPhaseGated', async () => {
      // First trigger a phase-gated error to set all states
      const phaseError = new SelemeneApiError(
        { error: 'Phase access denied', error_code: 'PHASE_ACCESS_DENIED' },
        403,
      );
      mockExecuteWorkflow.mockRejectedValueOnce(phaseError);

      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.execute('advanced-workflow', { birthDate: '1990-01-01' });
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isPhaseGated).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isPhaseGated).toBe(false);
    });
  });
});
