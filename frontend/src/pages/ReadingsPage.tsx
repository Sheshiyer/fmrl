/**
 * ReadingsPage
 * Lists historical readings with expandable result views
 */
import { useState, useEffect, useCallback } from 'react';
import { History, ChevronDown, ChevronRight, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { useSelemene } from '../hooks/useSelemene';
import { EngineResultRenderer } from '../components/Engines/EngineResultRenderer';
import type { ReadingRecord } from '../types/selemene';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

function ReadingCard({ reading }: { reading: ReadingRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mystic-panel !p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full !p-4 flex items-start gap-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="mt-0.5 text-pip-text-muted">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-pip-text-primary font-mono">
              {reading.engine_id}
            </span>
            <span className="text-xs text-pip-text-muted">
              {formatDate(reading.created_at)}
            </span>
          </div>
          {reading.witness_prompt && (
            <p className="mt-1.5 text-sm text-pip-text-secondary italic">
              "{truncate(reading.witness_prompt, 120)}"
            </p>
          )}
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] border border-pip-gold/30 bg-pip-gold/10 text-pip-gold">
          L{reading.consciousness_level}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-pip-border/30 p-4">
          <EngineResultRenderer
            engineId={reading.engine_id}
            result={reading.result_data}
          />
        </div>
      )}
    </div>
  );
}

export function ReadingsPage() {
  const { client, isConnected, isLoading: selemeneLoading } = useSelemene();
  const [readings, setReadings] = useState<ReadingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReadings = useCallback(async () => {
    if (!client || !isConnected) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.listReadings();
      setReadings(data ?? []);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected]);

  useEffect(() => {
    void fetchReadings();
  }, [fetchReadings]);

  // Not connected
  if (!isConnected && !selemeneLoading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="mystic-panel !p-8 max-w-md text-center flex flex-col items-center gap-4">
          <WifiOff className="w-10 h-10 text-pip-warning" />
          <h2 className="mystic-section-title text-lg">Not Connected</h2>
          <p className="text-sm text-pip-text-secondary">
            Connect to Selemene Engine to view your reading history.
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading || selemeneLoading) {
    return (
      <div className="h-full min-h-0 flex flex-col gap-4 overflow-auto p-1">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-pip-gold" />
          <h1 className="mystic-section-title text-lg">Readings</h1>
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mystic-panel !p-5 animate-pulse">
              <div className="h-4 w-1/3 rounded bg-white/5" />
              <div className="h-3 w-2/3 rounded bg-white/5 mt-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="mystic-panel !p-8 max-w-md text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-10 h-10 text-pip-warning" />
          <h2 className="mystic-section-title text-lg">Failed to Load Readings</h2>
          <p className="text-sm text-pip-text-secondary">{error}</p>
          <button
            type="button"
            onClick={() => void fetchReadings()}
            className="mystic-btn mystic-btn-ghost flex items-center gap-2 !px-4 !py-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty
  if (readings.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="mystic-panel !p-8 max-w-md text-center flex flex-col items-center gap-4">
          <History className="w-10 h-10 text-pip-text-muted" />
          <h2 className="mystic-section-title text-lg">No Readings Yet</h2>
          <p className="text-sm text-pip-text-secondary">
            Run a calculation from the Engines page to create your first reading.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 overflow-auto p-1">
      <div className="flex items-center gap-3">
        <History className="w-5 h-5 text-pip-gold" />
        <h1 className="mystic-section-title text-lg">Readings</h1>
        <span className="text-xs text-pip-text-muted">
          {readings.length} recorded
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {readings.map((reading) => (
          <ReadingCard key={reading.id} reading={reading} />
        ))}
      </div>
    </div>
  );
}
