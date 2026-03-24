/**
 * SigilForgeResult Component
 * Dedicated renderer for the Sigil Forge engine — generates personalized sigils
 * from intentions using the Rose Cross / planetary square method.
 * Displays an SVG sigil canvas, intention card, correspondences grid,
 * and collapsible activation instructions.
 */
import { useState, useMemo } from 'react';
import { Clock, Cpu, Database, Sparkles, ChevronDown, ChevronUp, Flame, Droplets, Wind, Mountain } from 'lucide-react';
import type { EngineOutput } from '../../types/selemene';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Safely access nested properties by trying multiple possible key names. */
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
    const obj = value as Record<string, unknown>;
    if (obj.name) return String(obj.name);
    if (obj.value) return String(obj.value);
    return JSON.stringify(value);
  }
  return String(value);
}

// ── Planetary color mapping ─────────────────────────────────────────────────

const PLANET_COLORS: Record<string, string> = {
  sun: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  moon: 'bg-slate-300/20 text-slate-300 border-slate-400/40',
  mars: 'bg-red-500/20 text-red-400 border-red-500/40',
  mercury: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40',
  jupiter: 'bg-indigo-400/20 text-indigo-300 border-indigo-400/40',
  venus: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
  saturn: 'bg-stone-500/20 text-stone-400 border-stone-500/40',
  uranus: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40',
  neptune: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  pluto: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
};

const ELEMENT_STYLES: Record<string, { color: string; icon: typeof Flame }> = {
  fire: { color: 'bg-red-500/20 text-red-400 border-red-500/40', icon: Flame },
  water: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', icon: Droplets },
  air: { color: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40', icon: Wind },
  earth: { color: 'bg-green-500/20 text-green-400 border-green-500/40', icon: Mountain },
};

// ── Sigil SVG Canvas ────────────────────────────────────────────────────────

/**
 * Generate Rose Cross-style sigil points from intention text.
 * Maps unique consonants to positions on a circle, then connects them
 * in order to form the sigil pattern.
 */
function generateRoseCrossPoints(intention: string): { x: number; y: number }[] {
  const GRID_LETTERS = 'BCDFGHJKLMNPQRSTVWXYZ';
  const cleaned = intention
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .filter((ch) => GRID_LETTERS.includes(ch));

  // Deduplicate consecutive identical letters
  const filtered: string[] = [];
  for (const ch of cleaned) {
    if (filtered.length === 0 || filtered[filtered.length - 1] !== ch) {
      filtered.push(ch);
    }
  }

  if (filtered.length === 0) return [];

  const cx = 100;
  const cy = 100;
  const radius = 75;

  return filtered.map((ch) => {
    const idx = GRID_LETTERS.indexOf(ch);
    const angle = (idx / GRID_LETTERS.length) * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
}

interface SigilCanvasProps {
  sigilData: unknown;
  intention: string;
}

function SigilCanvas({ sigilData, intention }: SigilCanvasProps) {
  const { pathD, points } = useMemo(() => {
    // Case 1: SVG path strings
    if (typeof sigilData === 'string' && sigilData.trim().length > 0) {
      return { pathD: sigilData, points: null };
    }

    // Case 2: Array of SVG path strings
    if (Array.isArray(sigilData) && sigilData.length > 0 && typeof sigilData[0] === 'string') {
      return { pathD: sigilData.join(' '), points: null };
    }

    // Case 3: Array of coordinate pairs [{x,y}...] or [[x,y]...]
    if (Array.isArray(sigilData) && sigilData.length > 0) {
      const first = sigilData[0];
      if (typeof first === 'object' && first !== null && ('x' in first || Array.isArray(first))) {
        const coords = sigilData.map((p: unknown) => {
          if (Array.isArray(p)) return { x: Number(p[0]), y: Number(p[1]) };
          const pt = p as { x: number; y: number };
          return { x: pt.x, y: pt.y };
        });
        return { pathD: null, points: coords };
      }
    }

    // Case 4: Fallback — generate from intention using Rose Cross method
    const generated = generateRoseCrossPoints(intention || 'SIGIL');
    return { pathD: null, points: generated };
  }, [sigilData, intention]);

  return (
    <div className="mystic-panel !p-0 flex items-center justify-center">
      <div className="relative w-[220px] h-[220px] flex items-center justify-center">
        {/* Dark background with gold circle border */}
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          className="absolute inset-0"
          aria-hidden="true"
        >
          <rect width="220" height="220" rx="12" fill="rgba(0,0,0,0.3)" />
          <circle
            cx="110"
            cy="110"
            r="95"
            fill="none"
            stroke="rgba(216,179,106,0.25)"
            strokeWidth="1.5"
          />
          <circle
            cx="110"
            cy="110"
            r="88"
            fill="none"
            stroke="rgba(216,179,106,0.1)"
            strokeWidth="0.5"
            strokeDasharray="3 4"
          />
        </svg>

        {/* Sigil paths */}
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          className="relative z-10"
          role="img"
          aria-label={`Sigil for: ${intention}`}
        >
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="rgb(216,179,106)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {points && points.length > 1 && (
            <>
              {/* Connecting lines */}
              <polyline
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="rgb(216,179,106)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
              {/* Start circle */}
              <circle cx={points[0].x} cy={points[0].y} r="4" fill="rgb(216,179,106)" opacity="0.9" />
              {/* End cross */}
              {(() => {
                const last = points[points.length - 1];
                return (
                  <>
                    <line
                      x1={last.x - 4}
                      y1={last.y - 4}
                      x2={last.x + 4}
                      y2={last.y + 4}
                      stroke="rgb(216,179,106)"
                      strokeWidth="2"
                    />
                    <line
                      x1={last.x + 4}
                      y1={last.y - 4}
                      x2={last.x - 4}
                      y2={last.y + 4}
                      stroke="rgb(216,179,106)"
                      strokeWidth="2"
                    />
                  </>
                );
              })()}
              {/* Intermediate dots */}
              {points.slice(1, -1).map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="2"
                  fill="rgb(216,179,106)"
                  opacity="0.5"
                />
              ))}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function SigilForgeResult({ result }: { result: EngineOutput }) {
  const [activationOpen, setActivationOpen] = useState(false);

  if (!result) {
    return (
      <div className="mystic-panel !p-6 text-center text-pip-text-muted">
        No sigil data available.
      </div>
    );
  }

  const data = (result.result ?? {}) as Record<string, unknown>;

  // Extract fields using getField helper for flexible key naming
  const intention = displayValue(getField(data, 'intention', 'statement'));
  const sigilData = getField(data, 'sigil_data', 'sigil', 'paths');
  const planets = getField(data, 'planetary_correspondences', 'planets') as string[] | undefined;
  const elements = getField(data, 'elemental_correspondence', 'elements') as
    | string
    | string[]
    | undefined;
  const activation = displayValue(getField(data, 'activation_method', 'activation'));
  const rootNumber = getField(data, 'numerological_root', 'root_number');
  const grid = getField(data, 'alphabet_grid', 'grid');
  const description = displayValue(getField(data, 'description', 'meaning'));

  // Normalize elements to array
  const elementList: string[] = Array.isArray(elements)
    ? elements
    : typeof elements === 'string'
      ? elements.split(/[,\s]+/).filter(Boolean)
      : [];

  // Parse activation into steps if it contains numbered lines or newlines
  const activationSteps: string[] = activation === '\u2014'
    ? []
    : activation
        .split(/\n|(?:\d+\.\s)/)
        .map((s) => s.trim())
        .filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Witness Prompt ────────────────────────────────────────────── */}
      {result.witness_prompt && (
        <div className="mystic-panel !p-5">
          <p className="text-lg italic text-pip-gold leading-relaxed">
            &ldquo;{result.witness_prompt}&rdquo;
          </p>
        </div>
      )}

      {/* ── Badges ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs border border-pip-border/50 bg-black/20 text-pip-text-secondary flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          {result.engine_id}
        </span>
        <span className="px-3 py-1 rounded-full text-xs border border-pip-gold/30 bg-pip-gold/10 text-pip-gold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Level {result.consciousness_level}
        </span>
        {rootNumber !== undefined && (
          <span className="px-3 py-1 rounded-full text-xs border border-purple-500/30 bg-purple-500/10 text-purple-300 font-bold">
            Root {displayValue(rootNumber)}
          </span>
        )}
      </div>

      {/* ── Sigil Canvas ──────────────────────────────────────────────── */}
      <SigilCanvas sigilData={sigilData} intention={intention} />

      {/* ── Intention Card ────────────────────────────────────────────── */}
      {intention !== '\u2014' && (
        <div className="mystic-panel !p-5 text-center">
          <div className="mystic-eyebrow text-xs mb-2">Encoded Intention</div>
          <p className="text-lg italic text-pip-text-primary leading-relaxed font-serif">
            &ldquo;{intention}&rdquo;
          </p>
        </div>
      )}

      {/* ── Sigil Meaning ─────────────────────────────────────────────── */}
      {description !== '\u2014' && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-2">Sigil Interpretation</div>
          <p className="text-sm text-pip-text-secondary leading-relaxed">{description}</p>
        </div>
      )}

      {/* ── Correspondences 2x2 Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Planetary */}
        <div className="mystic-panel !p-4 flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-pip-gold/70 font-medium">
            Planetary
          </span>
          {Array.isArray(planets) && planets.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {planets.map((planet, i) => {
                const key = String(planet).toLowerCase();
                const cls =
                  PLANET_COLORS[key] ?? 'bg-pip-dark text-pip-text-secondary border-pip-border';
                return (
                  <span
                    key={i}
                    className={`px-2.5 py-1 rounded-full text-xs border font-medium ${cls}`}
                  >
                    {String(planet)}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-sm text-pip-text-muted">{'\u2014'}</span>
          )}
        </div>

        {/* Elemental */}
        <div className="mystic-panel !p-4 flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-pip-gold/70 font-medium">
            Elemental
          </span>
          {elementList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {elementList.map((el, i) => {
                const key = el.toLowerCase();
                const style = ELEMENT_STYLES[key];
                const Icon = style?.icon ?? Sparkles;
                const cls =
                  style?.color ?? 'bg-pip-dark text-pip-text-secondary border-pip-border';
                return (
                  <span
                    key={i}
                    className={`px-2.5 py-1 rounded-full text-xs border font-medium flex items-center gap-1 ${cls}`}
                  >
                    <Icon className="w-3 h-3" />
                    {el}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-sm text-pip-text-muted">{'\u2014'}</span>
          )}
        </div>

        {/* Numerological Root */}
        <div className="mystic-panel !p-4 flex flex-col items-center justify-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-pip-gold/70 font-medium">
            Numerological Root
          </span>
          <span className="text-4xl font-bold text-pip-gold">
            {rootNumber !== undefined ? displayValue(rootNumber) : '\u2014'}
          </span>
        </div>

        {/* Activation Method (summary) */}
        <div className="mystic-panel !p-4 flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-wider text-pip-gold/70 font-medium">
            Activation
          </span>
          <p className="text-sm text-pip-text-secondary leading-relaxed line-clamp-4">
            {activation}
          </p>
        </div>
      </div>

      {/* ── Alphabet Grid ─────────────────────────────────────────────── */}
      {grid !== undefined && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-2">Alphabet Grid</div>
          {typeof grid === 'string' ? (
            <pre className="text-xs text-pip-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
              {grid}
            </pre>
          ) : Array.isArray(grid) ? (
            <div className="flex flex-col gap-1">
              {(grid as unknown[][]).map((row, ri) => (
                <div key={ri} className="flex gap-2 justify-center">
                  {Array.isArray(row)
                    ? row.map((cell, ci) => (
                        <span
                          key={ci}
                          className="w-7 h-7 flex items-center justify-center text-xs font-mono rounded border border-pip-border/30 bg-black/20 text-pip-text-primary"
                        >
                          {String(cell)}
                        </span>
                      ))
                    : (
                        <span className="text-xs text-pip-text-secondary font-mono">
                          {String(row)}
                        </span>
                      )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-pip-text-secondary">{displayValue(grid)}</p>
          )}
        </div>
      )}

      {/* ── Activation Instructions (Collapsible) ────────────────────── */}
      {activationSteps.length > 0 && (
        <div className="mystic-panel !p-0 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-pip-gold/5 transition-colors"
            onClick={() => setActivationOpen((prev) => !prev)}
          >
            <span className="mystic-eyebrow text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pip-gold" />
              Activation Instructions
            </span>
            {activationOpen ? (
              <ChevronUp className="w-4 h-4 text-pip-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-pip-text-muted" />
            )}
          </button>
          {activationOpen && (
            <div className="px-4 pb-4 flex flex-col gap-2">
              {activationSteps.map((step, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-pip-gold font-bold min-w-[1.5rem] text-right">
                    {i + 1}.
                  </span>
                  <span className="text-pip-text-secondary leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Metadata Footer ──────────────────────────────────────────── */}
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
