/**
 * useWorkflow — Execute a Selemene workflow and track state
 * Handles loading, error, phase-gating, and result management.
 */
import { useState, useCallback } from 'react';
import { useSelemene } from './useSelemene';
import type { EngineInput, WorkflowResult } from '../types/selemene';
import { SelemeneApiError } from '../services/SelemeneClient';

interface UseWorkflowReturn {
  result: WorkflowResult | null;
  isLoading: boolean;
  error: Error | null;
  isPhaseGated: boolean;
  execute: (workflowId: string, input: EngineInput) => Promise<WorkflowResult | null>;
  reset: () => void;
}

export function useWorkflow(): UseWorkflowReturn {
  const { client, isConnected } = useSelemene();
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isPhaseGated, setIsPhaseGated] = useState(false);

  const execute = useCallback(async (workflowId: string, input: EngineInput) => {
    if (!isConnected) {
      setError(new Error('Not connected to Selemene API'));
      return null;
    }
    setIsLoading(true);
    setError(null);
    setIsPhaseGated(false);
    try {
      const output = await client.executeWorkflow(workflowId, input);
      setResult(output);
      return output;
    } catch (err) {
      if (err instanceof SelemeneApiError && err.isPhaseAccessDenied) {
        setIsPhaseGated(true);
      }
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsPhaseGated(false);
  }, []);

  return { result, isLoading, error, isPhaseGated, execute, reset };
}
