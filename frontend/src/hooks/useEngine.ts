/**
 * useEngine — React hook for single-engine calculation
 * Wraps SelemeneClient.calculate with loading/error state management.
 */
import { useState, useCallback } from 'react';
import { useSelemene } from './useSelemene';
import type { EngineInput, EngineOutput } from '../types/selemene';

export function useEngine(engineId: string) {
  const { client, isConnected } = useSelemene();
  const [result, setResult] = useState<EngineOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const calculate = useCallback(async (input: EngineInput) => {
    if (!isConnected) {
      setError(new Error('Not connected to Selemene Engine'));
      return null;
    }
    setIsLoading(true);
    setError(null);
    try {
      const output = await client.calculate(engineId, input);
      setResult(output);
      return output;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, engineId, isConnected]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isLoading, error, calculate, reset, isConnected };
}
