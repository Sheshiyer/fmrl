/**
 * VimshottariResult Component
 * Dedicated renderer for the Vimshottari Dasha (Vedic planetary period) engine.
 * Displays current Mahadasha, active sub-periods (Antardasha / Pratyantar),
 * a horizontal timeline bar of the full dasha sequence, and a collapsible
 * period table — all wrapped in the standard witness-prompt / badges / metadata
 * pattern used by every other engine renderer.
 */
import { useState } from 'react';
import {
  Clock,
  Cpu,
  Database,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Circle,
  Timer,
} from 'lucide-react';
import type { EngineOutput } from '../../types/selemene';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Try multiple possible keys (case-insensitive fallback). */
function getField(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const val = obj[key] ?? obj[key.toLowerCase()];
    if (val !== undefined) return val;
  }
  return undefined;
}

/** Safe display string — dash for missing data, unwrap name/value objects. */
function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '\u2014';
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (o.name) return String(o.name);
    if (o.value) return String(o.value);
    return JSON.stringify(value);
  }
  return String(value);
}

/* ------------------------------------------------------------------ */
/*  Planet colour map                                                  */
/* ------------------------------------------------------------------ */

const PLANET_COLORS: Record<string, string> = {
  sun: '#f59e0b',
  surya: '#f59e0b',
  moon: '#94a3b8',
  chandra: '#94a3b8',
  mars: '#ef4444',
  mangal: '#ef4444',
  rahu: '#6366f1',
  jupiter: '#eab308',
  guru: '#eab308',
  saturn: '#6b7280',
  shani: '#6b7280',
  mercury: '#22c55e',
  budha: '#22c55e',
  ketu: '#8b5cf6',
  venus: '#ec4899',
  shukra: '#ec4899',
};

function planetColor(name: unknown): string {
  if (!name) return '#94a3b8';
  const key = String(name).toLowerCase().trim();
  return PLANET_COLORS[key] ?? '#94a3b8';
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

interface DashaEntry {
  planet?: string;
  name?: string;
  start?: string;
  start_date?: string;
  end?: string;
  end_date?: string;
  duration?: number | string;
  duration_years?: number | string;
  years?: number | string;
  current?: boolean;
  is_current?: boolean;
}

function normalisePlanet(entry: DashaEntry): string {
  return displayValue(entry.planet ?? entry.name);
}

function normaliseStart(entry: DashaEntry): string {
  return displayValue(entry.start ?? entry.start_date);
}

function normaliseEnd(entry: DashaEntry): string {
  return displayValue(entry.end ?? entry.end_date);
}

function normaliseDuration(entry: DashaEntry): string {
  const raw = entry.duration ?? entry.duration_years ?? entry.years;
  if (raw === null || raw === undefined) return '\u2014';
  const num = Number(raw);
  if (!isNaN(num)) return `${num} yr${num !== 1 ? 's' : ''}`;
  return String(raw);
}

function isCurrent(entry: DashaEntry): boolean {
  return entry.current === true || entry.is_current === true;
}

/* ------------------------------------------------------------------ */
/*  Current Period Card                                                */
/* ------------------------------------------------------------------ */

function CurrentPeriodCard({ data }: { data: Record<string, unknown> }) {
  const mahaRaw = getField(data, 'mahadasha', 'current_mahadasha', 'maha_dasha') as
    | DashaEntry
    | string
    | undefined;

  let planet: string;
  let start: string;
  let end: string;
  let remaining: string;

  if (typeof mahaRaw === 'object' && mahaRaw !== null) {
    const m = mahaRaw as DashaEntry;
    planet = normalisePlanet(m);
    start = normaliseStart(m);
    end = normaliseEnd(m);
    remaining = displayValue(
      getField(m as unknown as Record<string, unknown>, 'remaining', 'remaining_years', 'remaining_duration') ??
        getField(data, 'remaining_years', 'remaining', 'remaining_duration'),
    );
  } else {
    planet = displayValue(mahaRaw ?? getField(data, 'current_planet', 'planet'));
    start = displayValue(getField(data, 'start', 'start_date'));
    end = displayValue(getField(data, 'end', 'end_date'));
    remaining = displayValue(getField(data, 'remaining_years', 'remaining', 'remaining_duration'));
  }

  const color = planetColor(planet);

  return (
    <div className="mystic-panel !p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Circle className="w-3.5 h-3.5" style={{ color }} fill={color} />
        <span className="text-[10px] uppercase tracking-wider text-pip-gold/70 font-medium">
          Current Mahadasha
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold" style={{ color }}>
          {planet}
        </span>
        {remaining !== '\u2014' && (
          <span className="flex items-center gap-1 text-xs text-pip-text-secondary">
            <Timer className="w-3 h-3" />
            {remaining} remaining
          </span>
        )}
      </div>

      <div className="flex gap-6 text-sm text-pip-text-secondary">
        {start !== '\u2014' && (
          <span>
            <span className="text-pip-text-muted text-[10px] uppercase tracking-wider mr-1">From</span>
            {start}
          </span>
        )}
        {end !== '\u2014' && (
          <span>
            <span className="text-pip-text-muted text-[10px] uppercase tracking-wider mr-1">To</span>
            {end}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Active Sub-Periods                                                 */
/* ------------------------------------------------------------------ */

function SubPeriodBadge({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;

  let planet: string;
  let dates = '';
  if (typeof value === 'object' && value !== null) {
    const v = value as DashaEntry;
    planet = normalisePlanet(v);
    const s = normaliseStart(v);
    const e = normaliseEnd(v);
    if (s !== '\u2014' || e !== '\u2014') dates = `${s} \u2013 ${e}`;
  } else {
    planet = displayValue(value);
  }

  const color = planetColor(planet);

  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-pip-border/50 bg-pip-dark/60">
      <span className="text-[9px] uppercase tracking-wider text-pip-text-muted font-medium">
        {label}
      </span>
      <span className="text-lg font-bold" style={{ color }}>
        {planet}
      </span>
      {dates && <span className="text-[11px] text-pip-text-secondary">{dates}</span>}
    </div>
  );
}

function ActiveSubPeriods({ data }: { data: Record<string, unknown> }) {
  const antar = getField(data, 'antardasha', 'current_antardasha', 'antar_dasha');
  const pratyantar = getField(data, 'pratyantar_dasha', 'current_pratyantar', 'pratyantardasha');

  if (!antar && !pratyantar) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <SubPeriodBadge label="Antardasha (Sub-Period)" value={antar} />
      <SubPeriodBadge label="Pratyantar (Sub-Sub)" value={pratyantar} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline Bar                                                       */
/* ------------------------------------------------------------------ */

function TimelineBar({ sequence }: { sequence: DashaEntry[] }) {
  if (!sequence || sequence.length === 0) return null;

  // Compute proportional widths via duration; fall back to equal segments.
  const durations = sequence.map((e) => {
    const raw = e.duration ?? e.duration_years ?? e.years;
    return raw !== null && raw !== undefined ? Number(raw) || 1 : 1;
  });
  const total = durations.reduce((a, b) => a + b, 0);

  return (
    <div className="mystic-panel !p-4 flex flex-col gap-3">
      <span className="text-[10px] uppercase tracking-wider text-pip-gold/70 font-medium">
        Dasha Timeline
      </span>

      <div className="flex h-8 rounded-lg overflow-hidden border border-pip-border/40">
        {sequence.map((entry, i) => {
          const planet = normalisePlanet(entry);
          const color = planetColor(planet);
          const pct = (durations[i] / total) * 100;
          const active = isCurrent(entry);

          return (
            <div
              key={i}
              className={`relative flex items-center justify-center transition-all ${
                active ? 'ring-2 ring-pip-gold ring-inset z-10' : ''
              }`}
              style={{
                width: `${pct}%`,
                backgroundColor: color,
                opacity: active ? 1 : 0.55,
                minWidth: '1.5rem',
              }}
              title={`${planet} — ${normaliseDuration(entry)}`}
            >
              {pct > 6 && (
                <span className="text-[9px] font-bold text-white drop-shadow-sm select-none truncate px-0.5">
                  {planet.slice(0, 3)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {sequence.map((entry, i) => {
          const planet = normalisePlanet(entry);
          const color = planetColor(planet);
          const active = isCurrent(entry);
          return (
            <span
              key={i}
              className={`flex items-center gap-1 text-[10px] ${
                active ? 'text-pip-text-primary font-semibold' : 'text-pip-text-muted'
              }`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {planet}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible Dasha Sequence Table                                   */
/* ------------------------------------------------------------------ */

function DashaSequenceTable({ sequence }: { sequence: DashaEntry[] }) {
  const [open, setOpen] = useState(false);

  if (!sequence || sequence.length === 0) return null;

  return (
    <div className="mystic-panel !p-4 flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center justify-between w-full text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[10px] uppercase tracking-wider text-pip-gold/70 font-medium">
          Full Dasha Sequence ({sequence.length} periods)
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-pip-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-pip-text-muted" />
        )}
      </button>

      {open && (
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-pip-text-muted border-b border-pip-border/30">
                <th className="text-left py-2 pr-4">Planet</th>
                <th className="text-left py-2 pr-4">Start</th>
                <th className="text-left py-2 pr-4">End</th>
                <th className="text-right py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {sequence.map((entry, i) => {
                const planet = normalisePlanet(entry);
                const color = planetColor(planet);
                const active = isCurrent(entry);
                return (
                  <tr
                    key={i}
                    className={`border-b border-pip-border/10 ${
                      active ? 'bg-pip-gold/10' : ''
                    }`}
                  >
                    <td className="py-2 pr-4 font-medium flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span style={{ color }}>{planet}</span>
                      {active && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pip-gold/20 text-pip-gold font-semibold ml-1">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-pip-text-secondary">{normaliseStart(entry)}</td>
                    <td className="py-2 pr-4 text-pip-text-secondary">{normaliseEnd(entry)}</td>
                    <td className="py-2 text-right text-pip-text-secondary">
                      {normaliseDuration(entry)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function VimshottariResult({ result }: { result: EngineOutput }) {
  if (!result) {
    return (
      <div className="mystic-panel !p-6 text-center text-pip-text-muted">
        No Vimshottari Dasha data available.
      </div>
    );
  }

  const data = (result.result ?? {}) as Record<string, unknown>;

  // Extract dasha sequence — try multiple possible shapes
  const rawSequence = getField(data, 'dasha_sequence', 'sequence', 'dashas', 'periods');
  const sequence = Array.isArray(rawSequence) ? (rawSequence as DashaEntry[]) : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Witness Prompt */}
      {result.witness_prompt && (
        <div className="mystic-panel !p-5">
          <p className="text-lg italic text-pip-gold leading-relaxed">
            &ldquo;{result.witness_prompt}&rdquo;
          </p>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs border border-pip-border/50 bg-black/20 text-pip-text-secondary">
          {result.engine_id}
        </span>
        <span className="px-3 py-1 rounded-full text-xs border border-pip-gold/30 bg-pip-gold/10 text-pip-gold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Level {result.consciousness_level}
        </span>
      </div>

      {/* 1. Current Period Card */}
      <CurrentPeriodCard data={data} />

      {/* 2. Active Sub-Periods */}
      <ActiveSubPeriods data={data} />

      {/* 3. Timeline Bar */}
      <TimelineBar sequence={sequence} />

      {/* 4. Collapsible Dasha Sequence Table */}
      <DashaSequenceTable sequence={sequence} />

      {/* Metadata Footer */}
      {result.metadata && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-3">Metadata</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2 text-pip-text-secondary">
              <Clock className="w-3.5 h-3.5 text-pip-text-muted" />
              <span>{result.metadata.calculation_time_ms}ms</span>
            </div>
            <div className="flex items-center gap-2 text-pip-text-secondary">
              <Cpu className="w-3.5 h-3.5 text-pip-text-muted" />
              <span>{result.metadata.backend}</span>
            </div>
            <div className="flex items-center gap-2 text-pip-text-secondary">
              <Database className="w-3.5 h-3.5 text-pip-text-muted" />
              <span>{result.metadata.cached ? 'Cached' : 'Fresh'}</span>
            </div>
            <div className="text-pip-text-muted text-xs">
              {new Date(result.metadata.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
