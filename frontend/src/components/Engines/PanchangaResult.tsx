/**
 * PanchangaResult Component
 * Dedicated renderer for the Panchanga (Vedic calendar) engine
 * Displays Tithi, Nakshatra, Yoga, Karana, Muhurta, and Sun/Moon data
 */
import { Clock, Cpu, Database, Moon, Sun, Sparkles } from 'lucide-react';
import type { EngineOutput } from '../../types/selemene';

/**
 * Safely access nested properties by trying multiple possible key names.
 * The Selemene API may return keys in various casings or naming conventions.
 */
function getField(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const val = obj[key] ?? obj[key.toLowerCase()];
    if (val !== undefined) return val;
  }
  return undefined;
}

/** Format a field value for display, returning a dash for missing data */
function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '\u2014';
  if (typeof value === 'object') {
    // If it has a 'name' property, use that (common for Panchanga sub-objects)
    const obj = value as Record<string, unknown>;
    if (obj.name) return String(obj.name);
    if (obj.value) return String(obj.value);
    return JSON.stringify(value);
  }
  return String(value);
}

interface PanchangaGridCellProps {
  label: string;
  value: unknown;
  sublabel?: string;
}

function PanchangaGridCell({ label, value, sublabel }: PanchangaGridCellProps) {
  const display = displayValue(value);
  // Extract sub-details if value is an object
  const details =
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  const lord = details ? displayValue(getField(details, 'lord', 'deity', 'ruling_deity')) : null;

  return (
    <div className="mystic-panel !p-4 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-pip-gold/70 font-medium">
        {label}
      </span>
      <span className="text-lg font-bold text-pip-text-primary leading-tight">{display}</span>
      {sublabel && (
        <span className="text-xs text-pip-text-muted">{sublabel}</span>
      )}
      {lord && lord !== '\u2014' && (
        <span className="text-xs text-pip-text-secondary">Lord: {lord}</span>
      )}
    </div>
  );
}

interface MuhurtaEntry {
  name?: string;
  time_range?: string;
  start?: string;
  end?: string;
  type?: string;
}

export function PanchangaResult({ result }: { result: EngineOutput }) {
  if (!result) {
    return (
      <div className="mystic-panel !p-6 text-center text-pip-text-muted">
        No Panchanga data available.
      </div>
    );
  }

  const data = (result.result ?? {}) as Record<string, unknown>;

  const tithi = getField(data, 'tithi', 'Tithi', 'lunar_day');
  const nakshatra = getField(data, 'nakshatra', 'Nakshatra', 'lunar_mansion', 'star');
  const yoga = getField(data, 'yoga', 'Yoga', 'nithya_yoga');
  const karana = getField(data, 'karana', 'Karana', 'half_tithi');
  const muhurta = getField(data, 'muhurta', 'Muhurta', 'muhurtas', 'auspicious_times') as
    | MuhurtaEntry[]
    | undefined;

  const sunrise = getField(data, 'sunrise', 'Sunrise', 'sun_rise');
  const sunset = getField(data, 'sunset', 'Sunset', 'sun_set');
  const moonrise = getField(data, 'moonrise', 'Moonrise', 'moon_rise');
  const moonset = getField(data, 'moonset', 'Moonset', 'moon_set');

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

      {/* Main 2x2 Grid: Tithi, Nakshatra, Yoga, Karana */}
      <div className="grid grid-cols-2 gap-3">
        <PanchangaGridCell label="Tithi" value={tithi} sublabel="Lunar Day" />
        <PanchangaGridCell label="Nakshatra" value={nakshatra} sublabel="Lunar Mansion" />
        <PanchangaGridCell label="Yoga" value={yoga} sublabel="Sun-Moon Angle" />
        <PanchangaGridCell label="Karana" value={karana} sublabel="Half Tithi" />
      </div>

      {/* Muhurta Section */}
      {Array.isArray(muhurta) && muhurta.length > 0 && (
        <div className="mystic-panel !p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-pip-gold" />
            <span className="text-[10px] uppercase tracking-wider text-pip-gold/70 font-medium">
              Muhurta &mdash; Auspicious Windows
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {muhurta.map((entry, i) => {
              const name = entry.name ?? `Muhurta ${i + 1}`;
              const timeRange =
                entry.time_range ?? (entry.start && entry.end ? `${entry.start} - ${entry.end}` : null);
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-pip-emerald font-medium">{name}</span>
                  {timeRange && (
                    <span className="text-pip-text-secondary text-xs">{timeRange}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sun/Moon Row */}
      {(sunrise !== undefined || sunset !== undefined || moonrise !== undefined || moonset !== undefined) && (
        <div className="mystic-panel !p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-pip-gold" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-pip-text-muted">Sunrise</span>
                <span className="text-pip-text-primary font-medium">{displayValue(sunrise)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-pip-warning" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-pip-text-muted">Sunset</span>
                <span className="text-pip-text-primary font-medium">{displayValue(sunset)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-pip-text-secondary" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-pip-text-muted">Moonrise</span>
                <span className="text-pip-text-primary font-medium">{displayValue(moonrise)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-pip-text-muted" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-pip-text-muted">Moonset</span>
                <span className="text-pip-text-primary font-medium">{displayValue(moonset)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

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
