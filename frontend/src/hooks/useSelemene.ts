/**
 * useSelemene — React hook for Selemene Engine connectivity and data
 * Provides a memoized SelemeneClient, connection status, and engine/workflow lists.
 */
import { useState, useEffect, useMemo } from 'react';
import { SelemeneClient } from '../services/SelemeneClient';
import { useAuth } from '../context/auth/AuthContext';
import type { EngineInfo, WorkflowInfo } from '../types/selemene';

export function useSelemene() {
  const { selemeneToken, status } = useAuth();
  const [engines, setEngines] = useState<EngineInfo[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const client = useMemo(() => {
    const c = new SelemeneClient(
      import.meta.env.VITE_SELEMENE_API_URL ?? 'https://selemene.tryambakam.space'
    );
    if (selemeneToken) c.setToken(selemeneToken);
    return c;
  }, [selemeneToken]);

  useEffect(() => {
    if (status === 'guest' || status === 'loading') return;
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      try {
        const healthy = await client.health();
        if (cancelled) return;
        setIsConnected(healthy);
        if (healthy) {
          const [engineList, workflowList] = await Promise.all([
            client.listEngines().catch(() => []),
            client.listWorkflows().catch(() => []),
          ]);
          if (!cancelled) {
            setEngines(engineList);
            setWorkflows(workflowList);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [client, status]);

  return { client, engines, workflows, isConnected, isLoading, error };
}
