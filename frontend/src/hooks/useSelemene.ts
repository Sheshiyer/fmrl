/**
 * useSelemene — React hook for Selemene API connectivity and data
 * Provides a memoized SelemeneClient, connection status, and engine/workflow lists.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SelemeneClient, SelemeneApiError } from '../services/SelemeneClient';
import { useAuth } from '../context/auth/AuthContext';
import type { EngineInfo, WorkflowInfo } from '../types/selemene';
import {
  FALLBACK_SELEMENE_API_KEY,
  FALLBACK_SELEMENE_ENGINES,
  FALLBACK_SELEMENE_WORKFLOWS,
} from '../data/selemeneCatalog';

export function useSelemene() {
  const { selemeneToken, session, status, connectSelemene } = useAuth();
  const effectiveToken = selemeneToken?.trim() || session?.access_token?.trim() || FALLBACK_SELEMENE_API_KEY;
  const hasSelemeneToken = Boolean(effectiveToken);
  const [engines, setEngines] = useState<EngineInfo[]>(
    hasSelemeneToken ? FALLBACK_SELEMENE_ENGINES : []
  );
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>(
    hasSelemeneToken ? FALLBACK_SELEMENE_WORKFLOWS : []
  );
  const [isConnected, setIsConnected] = useState(hasSelemeneToken);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => {
    const c = new SelemeneClient(
      import.meta.env.VITE_SELEMENE_API_URL ?? 'https://selemene.tryambakam.space'
    );
    if (effectiveToken) c.setToken(effectiveToken);
    return c;
  }, [effectiveToken]);

  const canAccessApi = hasSelemeneToken;

  useEffect(() => {
    // Skip while auth is still initializing
    if (status === 'loading') return;
    if (!hasSelemeneToken) {
      setEngines([]);
      setWorkflows([]);
      setIsConnected(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setEngines(FALLBACK_SELEMENE_ENGINES);
      setWorkflows(FALLBACK_SELEMENE_WORKFLOWS);
      setIsConnected(true);
      setIsLoading(true);
      setError(null);
      try {
        const [engineResult, workflowResult] = await Promise.allSettled([
          client.listEngines(),
          client.listWorkflows(),
        ]);

        if (cancelled) return;

        if (engineResult.status === 'rejected') {
          console.warn('[useSelemene] listEngines failed:', engineResult.reason);
        }

        if (workflowResult.status === 'rejected') {
          console.warn('[useSelemene] listWorkflows failed:', workflowResult.reason);
        }

        const engineList =
          engineResult.status === 'fulfilled' ? engineResult.value : [];
        const workflowList =
          workflowResult.status === 'fulfilled' ? workflowResult.value : [];

        setEngines(engineList.length > 0 ? engineList : FALLBACK_SELEMENE_ENGINES);
        setWorkflows(workflowList.length > 0 ? workflowList : FALLBACK_SELEMENE_WORKFLOWS);

        if (engineResult.status === 'rejected' || workflowResult.status === 'rejected') {
          const firstError =
            engineResult.status === 'rejected'
              ? engineResult.reason
              : workflowResult.status === 'rejected'
                ? workflowResult.reason
                : new Error('Live Selemene catalog request failed');
          setError(firstError instanceof Error ? firstError : new Error(String(firstError)));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [client, hasSelemeneToken, status]);

  // Shared JWT recovery: wraps any async API call with 401 retry logic.
  // Multiple concurrent calls share a single recovery promise so only one
  // re-auth roundtrip is made.
  const recoveryRef = useRef<Promise<void> | null>(null);

  const withAuthRecovery = useCallback(
    async <T>(apiFn: () => Promise<T>): Promise<T> => {
      try {
        return await apiFn();
      } catch (err) {
        const isExpired =
          (err instanceof SelemeneApiError && err.statusCode === 401) ||
          (err instanceof Error && /invalid or expired jwt/i.test(err.message));

        if (!isExpired || status !== 'authenticated') throw err;

        // Coalesce concurrent recoveries into one promise
        if (!recoveryRef.current) {
          recoveryRef.current = (async () => {
            try {
              const reconnect = await connectSelemene();
              if (reconnect.error) {
                // Bridge failed — fall back to hardcoded API key if available
                if (FALLBACK_SELEMENE_API_KEY) {
                  console.warn('[useSelemene] Bridge recovery failed, using fallback API key');
                  client.setToken(FALLBACK_SELEMENE_API_KEY);
                  return;
                }
                throw new Error(reconnect.error);
              }
              try {
                const refreshed = localStorage.getItem('fmrl_selemene_token')?.trim();
                if (refreshed) client.setToken(refreshed);
              } catch {
                // storage access error — ignore
              }
            } finally {
              // Clear so future expirations can trigger a fresh recovery
              recoveryRef.current = null;
            }
          })();
        }

        await recoveryRef.current;
        return apiFn();
      }
    },
    [client, status, connectSelemene],
  );

  return { client, engines, workflows, isConnected, canAccessApi, isLoading, error, withAuthRecovery };
}
