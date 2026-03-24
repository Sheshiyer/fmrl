/**
 * EnneagramResult Component
 * Dedicated renderer for the Enneagram personality engine.
 * Displays a 9-point circle SVG with integration/disintegration arrows,
 * type card with wing/center/instinct badges, growth & stress directions,
 * strengths & challenges lists, and type description.
 */
import { Sparkles, ArrowUp, ArrowDown, Clock, Cpu, Database } from 'lucide-react';
import type { EngineOutput } from '../../types/selemene';

// ── Helpers ────────────────────────────────────────────────────────

function getField(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const val = obj[key] ?? obj[key.toLowerCase()];
    if (val !== undefined) return val;
  }
  return undefined;
}

const TYPE_NAMES: Record<number, string> = {
  1: 'The Reformer',
  2: 'The Helper',
  3: 'The Achiever',
  4: 'The Individualist',
  5: 'The Investigator',
  6: 'The Loyalist',
  7: 'The Enthusiast',
  8: 'The Challenger',
  9: 'The Peacemaker',
};

/** Compute (x, y) on a circle for enneagram point i (1–9) */
function pointPosition(i: number, cx: number, cy: number, r: number): { x: number; y: number } {
  const angleDeg = i * 40 - 90; // 1→-50°, 2→-10°, …, 9→270°
  const angleRad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

// ── Sub-components ─────────────────────────────────────────────────

function EnneagramCircle({
  coreType,
  growthType,
  stressType,
}: {
  coreType: number;
  growthType: number | null;
  stressType: number | null;
}) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78; // radius for points
  const dotR = 16; // radius for point circles

  const points = Array.from({ length: 9 }, (_, idx) => {
    const num = idx + 1;
    const pos = pointPosition(num, cx, cy, r);
    return { num, ...pos };
  });

  const corePos = pointPosition(coreType, cx, cy, r);
  const growthPos = growthType ? pointPosition(growthType, cx, cy, r) : null;
  const stressPos = stressType ? pointPosition(stressType, cx, cy, r) : null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
      role="img"
      aria-label={`Enneagram circle highlighting Type ${coreType}`}
    >
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="1" className="text-pip-border" />

      {/* Integration arrow (green dashed) */}
      {growthPos && (
        <line
          x1={corePos.x}
          y1={corePos.y}
          x2={growthPos.x}
          y2={growthPos.y}
          stroke="#22c55e"
          strokeWidth="2"
          strokeDasharray="6 3"
          markerEnd="url(#arrowGreen)"
        />
      )}

      {/* Disintegration arrow (red dashed) */}
      {stressPos && (
        <line
          x1={corePos.x}
          y1={corePos.y}
          x2={stressPos.x}
          y2={stressPos.y}
          stroke="#ef4444"
          strokeWidth="2"
          strokeDasharray="6 3"
          markerEnd="url(#arrowRed)"
        />
      )}

      {/* Arrow markers */}
      <defs>
        <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#22c55e" />
        </marker>
        <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#ef4444" />
        </marker>
      </defs>

      {/* Point circles + labels */}
      {points.map(({ num, x, y }) => {
        const isCore = num === coreType;
        const isGrowth = num === growthType;
        const isStress = num === stressType;

        let fill = 'transparent';
        let stroke = 'currentColor';
        let strokeClass = 'text-pip-border';
        let textClass = 'fill-pip-text-secondary';

        if (isCore) {
          fill = '#d4a843'; // pip-gold
          stroke = '#d4a843';
          strokeClass = '';
          textClass = 'fill-black';
        } else if (isGrowth) {
          stroke = '#22c55e';
          strokeClass = '';
          textClass = 'fill-green-400';
        } else if (isStress) {
          stroke = '#ef4444';
          strokeClass = '';
          textClass = 'fill-red-400';
        }

        return (
          <g key={num}>
            <circle
              cx={x}
              cy={y}
              r={dotR}
              fill={fill}
              stroke={stroke}
              strokeWidth="2"
              className={strokeClass}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="13"
              fontWeight="700"
              className={textClass}
            >
              {num}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function EnneagramResult({ result }: { result: EngineOutput }) {
  if (!result) {
    return (
      <div className="mystic-panel !p-6 text-center text-pip-text-muted">
        No enneagram data available.
      </div>
    );
  }

  const data = (result.result ?? {}) as Record<string, unknown>;

  // ── Extract fields ───────────────────────────────────────────────
  const rawType = getField(data, 'type', 'core_type', 'coreType');
  const coreType = typeof rawType === 'number' ? rawType : parseInt(String(rawType), 10) || 0;
  const typeName = TYPE_NAMES[coreType] ?? String(getField(data, 'type_name', 'typeName') ?? '');

  const wing = String(getField(data, 'wing', 'wings', 'dominant_wing') ?? '—');

  const instinct = String(
    getField(data, 'instinctual_variant', 'instinct', 'instinctual_subtype', 'variant') ?? '—',
  );

  const tritype = String(getField(data, 'tritype', 'tri_type', 'triType') ?? '—');

  const rawGrowth = getField(data, 'integration_direction', 'growth', 'integration', 'growth_type');
  const growthType = rawGrowth ? (typeof rawGrowth === 'number' ? rawGrowth : parseInt(String(rawGrowth), 10) || null) : null;

  const rawStress = getField(data, 'disintegration_direction', 'stress', 'disintegration', 'stress_type');
  const stressType = rawStress ? (typeof rawStress === 'number' ? rawStress : parseInt(String(rawStress), 10) || null) : null;

  const center = String(getField(data, 'center', 'intelligence_center', 'triad') ?? '—');

  const description = String(getField(data, 'description', 'type_description', 'typeDescription') ?? '');

  const strengths = (getField(data, 'strengths', 'core_strengths') ?? []) as string[];
  const challenges = (getField(data, 'challenges', 'blind_spots', 'weaknesses') ?? []) as string[];

  // ── Render ───────────────────────────────────────────────────────
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

      {/* Engine + Consciousness Badge Row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs border border-pip-border/50 bg-black/20 text-pip-text-secondary flex items-center gap-1.5">
          {result.engine_id}
        </span>
        <span className="px-3 py-1 rounded-full text-xs border border-pip-gold/30 bg-pip-gold/10 text-pip-gold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Level {result.consciousness_level}
        </span>
      </div>

      {/* 9-Point Circle + Type Card — side by side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
        {/* SVG Circle */}
        <div className="mystic-panel !p-4 flex items-center justify-center">
          <EnneagramCircle coreType={coreType} growthType={growthType} stressType={stressType} />
        </div>

        {/* Type Card */}
        <div className="mystic-panel !p-5 flex flex-col gap-3">
          {/* Type headline */}
          <div>
            <span className="text-pip-text-muted text-xs uppercase tracking-wider">Core Type</span>
            <h3 className="text-2xl font-bold text-pip-gold mt-1">
              {coreType > 0 ? `Type ${coreType}` : '—'}
              {typeName && <span className="text-pip-text-primary font-normal"> — {typeName}</span>}
            </h3>
          </div>

          {/* Badges: Wing, Center, Instinct, Tritype */}
          <div className="flex flex-wrap gap-2 mt-1">
            {wing !== '—' && (
              <span className="px-3 py-1 rounded-full text-xs border border-pip-gold/30 bg-pip-gold/10 text-pip-gold">
                Wing {wing}
              </span>
            )}
            {center !== '—' && (
              <span className="px-3 py-1 rounded-full text-xs border border-purple-500/30 bg-purple-500/10 text-purple-300">
                {center} Center
              </span>
            )}
            {instinct !== '—' && (
              <span className="px-3 py-1 rounded-full text-xs border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 capitalize">
                {instinct}
              </span>
            )}
            {tritype !== '—' && (
              <span className="px-3 py-1 rounded-full text-xs border border-pip-border/50 bg-black/20 text-pip-text-secondary">
                Tritype {tritype}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Growth & Stress — Two columns */}
      {(growthType || stressType) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Integration / Growth */}
          {growthType && (
            <div className="mystic-panel !p-4 border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUp className="w-4 h-4 text-green-400" />
                <span className="text-xs uppercase tracking-wider text-green-400 font-medium">Integration (Growth)</span>
              </div>
              <p className="text-pip-text-primary text-sm">
                Moves toward{' '}
                <span className="text-green-400 font-semibold">
                  Type {growthType} — {TYPE_NAMES[growthType] ?? ''}
                </span>
              </p>
            </div>
          )}

          {/* Disintegration / Stress */}
          {stressType && (
            <div className="mystic-panel !p-4 border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDown className="w-4 h-4 text-red-400" />
                <span className="text-xs uppercase tracking-wider text-red-400 font-medium">Disintegration (Stress)</span>
              </div>
              <p className="text-pip-text-primary text-sm">
                Moves toward{' '}
                <span className="text-red-400 font-semibold">
                  Type {stressType} — {TYPE_NAMES[stressType] ?? ''}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Strengths & Challenges */}
      {(strengths.length > 0 || challenges.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="mystic-panel !p-4">
              <div className="mystic-eyebrow text-xs mb-3 text-green-400">Strengths</div>
              <ul className="flex flex-col gap-1.5">
                {(strengths as string[]).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-pip-text-primary">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    {String(s)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Challenges */}
          {challenges.length > 0 && (
            <div className="mystic-panel !p-4">
              <div className="mystic-eyebrow text-xs mb-3 text-amber-400">Challenges</div>
              <ul className="flex flex-col gap-1.5">
                {(challenges as string[]).map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-pip-text-primary">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    {String(c)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-3">Type Description</div>
          <p className="text-sm text-pip-text-secondary leading-relaxed">{description}</p>
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
