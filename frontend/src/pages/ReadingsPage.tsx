/**
 * ReadingsPage
 * Full reading history with search, date filtering, expandable cards,
 * and all standard UI states (loading, empty, error, disconnected).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  WifiOff,
  Search,
  Calendar,
  Clock,
  X,
} from 'lucide-react';
import { useSelemene } from '../hooks/useSelemene';
import { EngineResultRenderer } from '../components/Engines/EngineResultRenderer';
import type { ReadingRecord } from '../types/selemene';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const ENGINE_COLORS: Record<string, string> = {
  vedic_chart: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  natal_chart: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  transit: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  synastry: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  progression: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
};

const DEFAULT_ENGINE_COLOR = 'bg-pip-gold/15 text-pip-gold border-pip-gold/40';

function engineColor(id: string): string {
  return ENGINE_COLORS[id] ?? DEFAULT_ENGINE_COLOR;
}

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

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\u2026';
}

function toDateStr(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
/*  ReadingCard                                                       */
/* ------------------------------------------------------------------ */

interface ReadingCardProps {
  reading: ReadingRecord;
  expanded: boolean;
  onToggle: () => void;
}

function ReadingCard({ reading, expanded, onToggle }: ReadingCardProps) {
  return (
    <div className="mystic-panel !p-0 overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={onToggle}
        className="w-full !p-4 flex items-start gap-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        {/* Chevron */}
        <div className="mt-0.5 text-pip-text-muted shrink-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Engine badge */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${engineColor(reading.engine_id)}`}
            >
              {reading.engine_id}
            </span>

            {/* Date */}
            <span className="text-xs text-pip-text-muted flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(reading.created_at)}
            </span>

            {/* Calc time */}
            <span className="text-xs text-pip-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatMs(reading.calculation_time_ms)}
            </span>
          </div>

          {/* Witness prompt preview */}
          {reading.witness_prompt && (
            <p className="mt-1.5 text-sm text-pip-text-secondary italic leading-relaxed">
              &ldquo;{truncate(reading.witness_prompt, 100)}&rdquo;
            </p>
          )}
        </div>

        {/* Consciousness level badge */}
        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] border border-pip-gold/30 bg-pip-gold/10 text-pip-gold font-medium">
          L{reading.consciousness_level}
        </span>
      </button>

      {/* Expanded result */}
      {expanded && (
        <div className="border-t border-pip-border/30 p-4 bg-black/10">
          <EngineResultRenderer
            engineId={reading.engine_id}
            result={reading.result_data}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                          */
/* ------------------------------------------------------------------ */

function SkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="mystic-panel !p-5 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="h-5 w-24 rounded-full bg-white/5" />
            <div className="h-3 w-32 rounded bg-white/5" />
            <div className="h-3 w-16 rounded bg-white/5" />
          </div>
          <div className="h-3 w-2/3 rounded bg-white/5 mt-3" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ReadingsPage                                                      */
/* ------------------------------------------------------------------ */

export function ReadingsPage() {
  const { client, isConnected, isLoading: selemeneLoading } = useSelemene();

  /* Data state */
  const [readings, setReadings] = useState<ReadingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* UI state */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  /* Fetch readings */
  const fetchReadings = useCallback(async () => {
    if (!client || !isConnected) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.listReadings(50);
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

  /* Client-side filtering */
  const filteredReadings = useMemo(() => {
    let result = readings;

    // Text search — engine_id or witness_prompt
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.engine_id.toLowerCase().includes(q) ||
          (r.witness_prompt && r.witness_prompt.toLowerCase().includes(q))
      );
    }

    // Date from
    if (dateFrom) {
      result = result.filter((r) => toDateStr(r.created_at) >= dateFrom);
    }

    // Date to
    if (dateTo) {
      result = result.filter((r) => toDateStr(r.created_at) <= dateTo);
    }

    return result;
  }, [readings, searchQuery, dateFrom, dateTo]);

  const hasActiveFilters = searchQuery || dateFrom || dateTo;

  function clearFilters() {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  }

  /* ---- Not connected ---- */
  if (!isConnected && !selemeneLoading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="mystic-panel !p-8 max-w-md text-center flex flex-col items-center gap-4">
          <WifiOff className="w-10 h-10 text-pip-warning" />
          <h2 className="mystic-section-title text-lg">Not Connected</h2>
          <p className="text-sm text-pip-text-secondary">
            Connect to Selemene API to view your reading history.
          </p>
        </div>
      </div>
    );
  }

  /* ---- Loading ---- */
  if (isLoading || selemeneLoading) {
    return (
      <div className="h-full min-h-0 flex flex-col gap-4 overflow-auto p-1">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-pip-gold" />
          <h1 className="mystic-section-title text-lg">Readings</h1>
        </div>
        <SkeletonList />
      </div>
    );
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="mystic-panel !p-8 max-w-md text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-10 h-10 text-pip-warning" />
          <h2 className="mystic-section-title text-lg">Failed to Load Readings</h2>
          <p className="text-sm text-pip-text-secondary break-all">{error}</p>
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

  /* ---- Empty (no readings at all) ---- */
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

  /* ---- Main content ---- */
  return (
    <div className="h-full min-h-0 flex flex-col gap-4 overflow-auto p-1">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <History className="w-5 h-5 text-pip-gold" />
        <h1 className="mystic-section-title text-lg">Readings</h1>
        <span className="text-xs text-pip-text-muted">
          {filteredReadings.length}{hasActiveFilters ? ` of ${readings.length}` : ''} recorded
        </span>
        <button
          type="button"
          onClick={() => void fetchReadings()}
          className="ml-auto text-pip-text-muted hover:text-pip-gold transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pip-text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search engine or witness prompt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-black/20 border border-pip-border/30 text-pip-text-primary placeholder:text-pip-text-muted/50 focus:outline-none focus:border-pip-gold/50 transition-colors"
          />
        </div>

        {/* Date from */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="date-from" className="text-[11px] text-pip-text-muted whitespace-nowrap">
            From
          </label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2 py-2 text-xs rounded-lg bg-black/20 border border-pip-border/30 text-pip-text-primary focus:outline-none focus:border-pip-gold/50 transition-colors"
          />
        </div>

        {/* Date to */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="date-to" className="text-[11px] text-pip-text-muted whitespace-nowrap">
            To
          </label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2 py-2 text-xs rounded-lg bg-black/20 border border-pip-border/30 text-pip-text-primary focus:outline-none focus:border-pip-gold/50 transition-colors"
          />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-pip-text-muted hover:text-pip-warning transition-colors px-2 py-2"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Results list */}
      {filteredReadings.length === 0 ? (
        <div className="mystic-panel !p-6 text-center">
          <Search className="w-6 h-6 text-pip-text-muted mx-auto mb-2" />
          <p className="text-sm text-pip-text-secondary">
            No readings match your filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-xs text-pip-gold hover:text-pip-gold/80 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredReadings.map((reading) => (
            <ReadingCard
              key={reading.id}
              reading={reading}
              expanded={expandedId === reading.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === reading.id ? null : reading.id))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
