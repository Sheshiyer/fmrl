import { useCallback, useMemo, useState } from 'react';
import { getBackendLogs, isTauriRuntime } from '../../utils/runtimeApi';

export function BackendLogsPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const desktop = useMemo(() => isTauriRuntime(), []);

  const refreshLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getBackendLogs(150);
    setLogs(result.logs);

    if (result.error) {
      setError(result.error);
    }

    setLoading(false);
  }, []);

  return (
    <div className="fixed bottom-4 right-3 sm:bottom-5 sm:right-5 z-40 flex flex-col items-end">
      {open && (
        <div className="mb-2 w-[min(94vw,500px)] max-h-[46vh] mystic-panel !rounded-xl !p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-pip-text-primary">Backend Sidecar Logs</h3>
            <button
              type="button"
              onClick={() => void refreshLogs()}
              disabled={loading}
              className="mystic-btn mystic-btn-ghost !text-xs !px-2.5 !py-1.5 disabled:opacity-60"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {!desktop && (
            <p className="mystic-status text-xs text-amber-200 border-amber-400/35 bg-amber-500/10">
              Not in desktop runtime. Launch with Tauri to view backend logs.
            </p>
          )}

          {error && <p className="mystic-error">{error}</p>}

          <div className="overflow-auto rounded-lg border border-pip-border/60 bg-black/50 p-2 text-[11px] leading-relaxed font-mono text-pip-text-secondary">
            {logs.length === 0 ? (
              <p className="text-pip-text-muted">No logs captured yet.</p>
            ) : (
              <ul className="space-y-1">
                {logs.map((line, index) => (
                  <li key={`${index}-${line.slice(0, 24)}`}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && logs.length === 0) void refreshLogs();
        }}
        className="mystic-btn mystic-btn-secondary !text-xs !px-3 !py-2"
      >
        {open ? 'Hide Logs' : 'Backend Logs'}
      </button>
    </div>
  );
}
