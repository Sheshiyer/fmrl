/**
 * SacredGeometryResult Component
 * Dedicated renderer for the Sacred Geometry engine showing geometric patterns,
 * harmonic ratios, frequency resonance, and associated metaphysical properties.
 * Renders inline SVG visualizations for Flower of Life, Metatron's Cube,
 * Sri Yantra, Seed of Life, and custom coordinate-based geometries.
 */
import { Sparkles, Clock, Cpu, Database, Hexagon, Waves } from 'lucide-react';
import type { EngineOutput } from '../../types/selemene';

/* ── Chakra color map ─────────────────────────────────────────────── */
const CHAKRA_COLORS: Record<string, string> = {
  root: '#ef4444',
  sacral: '#f97316',
  'solar plexus': '#eab308',
  heart: '#22c55e',
  throat: '#3b82f6',
  'third eye': '#6366f1',
  crown: '#a855f7',
};

function getChakraColor(chakra: string): string {
  const key = chakra.toLowerCase().replace(/[-_]/g, ' ');
  return CHAKRA_COLORS[key] ?? '#a855f7';
}

/* ── Field accessor with fallback aliases ─────────────────────────── */
function getField(data: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) return data[key];
  }
  return null;
}

/* ── SVG Geometry Renderers ───────────────────────────────────────── */

/** Generate positions of circles evenly around a center */
function ringPositions(cx: number, cy: number, radius: number, count: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    pts.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  return pts;
}

function FlowerOfLifeSVG() {
  const cx = 120, cy = 120, r = 30, spacing = 30;
  const innerRing = ringPositions(cx, cy, spacing, 6);
  const outerRing = ringPositions(cx, cy, spacing * 2, 6);
  const midRing = innerRing.map(([x, y], i) => {
    const next = innerRing[(i + 1) % 6];
    return [(x + next[0]) / 2 + (x + next[0] - 2 * cx) * 0.35, (y + next[1]) / 2 + (y + next[1] - 2 * cy) * 0.35] as [number, number];
  });

  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      {/* Center circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.9} />
      {/* Inner ring: 6 circles */}
      {innerRing.map(([x, y], i) => (
        <circle key={`inner-${i}`} cx={x} cy={y} r={r} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.7} />
      ))}
      {/* Mid ring: 6 circles between inner petals */}
      {midRing.map(([x, y], i) => (
        <circle key={`mid-${i}`} cx={x} cy={y} r={r} fill="none" stroke="#f59e0b" strokeWidth={0.6} opacity={0.4} />
      ))}
      {/* Outer ring: 6 circles */}
      {outerRing.map(([x, y], i) => (
        <circle key={`outer-${i}`} cx={x} cy={y} r={r} fill="none" stroke="#f59e0b" strokeWidth={0.5} opacity={0.3} />
      ))}
      {/* Bounding circle */}
      <circle cx={cx} cy={cy} r={r * 3 + 4} fill="none" stroke="#f59e0b" strokeWidth={0.5} opacity={0.2} />
    </svg>
  );
}

function MetatronsCubeSVG() {
  const cx = 120, cy = 120, r = 8, spacing = 40;
  // 13 circles: 1 center + 6 inner ring + 6 outer ring
  const centers: [number, number][] = [[cx, cy]];
  const innerRing = ringPositions(cx, cy, spacing, 6);
  const outerRing = ringPositions(cx, cy, spacing * 2, 6);
  centers.push(...innerRing, ...outerRing);

  // Lines connect every center to every other center
  const lines: [number, number, number, number][] = [];
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) {
      lines.push([centers[i][0], centers[i][1], centers[j][0], centers[j][1]]);
    }
  }

  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={`l-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeWidth={0.4} opacity={0.3} />
      ))}
      {centers.map(([x, y], i) => (
        <circle key={`c-${i}`} cx={x} cy={y} r={r} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.8} />
      ))}
    </svg>
  );
}

function SriYantraSVG() {
  const cx = 120, cy = 120;
  // 9 interlocking triangles simplified as nested alternating up/down triangles
  const triangles: { size: number; up: boolean }[] = [
    { size: 90, up: true },
    { size: 82, up: false },
    { size: 70, up: true },
    { size: 62, up: false },
    { size: 52, up: true },
    { size: 44, up: false },
    { size: 34, up: true },
    { size: 26, up: false },
    { size: 16, up: true },
  ];

  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      {/* Outer circle */}
      <circle cx={cx} cy={cy} r={105} fill="none" stroke="#f59e0b" strokeWidth={0.5} opacity={0.3} />
      <circle cx={cx} cy={cy} r={100} fill="none" stroke="#f59e0b" strokeWidth={0.5} opacity={0.2} />
      {/* Triangles */}
      {triangles.map(({ size, up }, i) => {
        const yOffset = up ? -size * 0.15 : size * 0.15;
        const tipY = up ? cy - size + yOffset : cy + size + yOffset;
        const baseY = up ? cy + size * 0.5 + yOffset : cy - size * 0.5 + yOffset;
        const baseHalf = size * 0.85;
        const points = `${cx},${tipY} ${cx - baseHalf},${baseY} ${cx + baseHalf},${baseY}`;
        return (
          <polygon
            key={`t-${i}`}
            points={points}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={0.8}
            opacity={0.5 + i * 0.05}
          />
        );
      })}
      {/* Central bindu point */}
      <circle cx={cx} cy={cy} r={2} fill="#f59e0b" opacity={0.8} />
    </svg>
  );
}

function SeedOfLifeSVG() {
  const cx = 120, cy = 120, r = 30, spacing = 30;
  const ring = ringPositions(cx, cy, spacing, 6);

  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      {/* Center circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.9} />
      {/* 6 surrounding circles */}
      {ring.map(([x, y], i) => (
        <circle key={`s-${i}`} cx={x} cy={y} r={r} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.7} />
      ))}
      {/* Bounding circle */}
      <circle cx={cx} cy={cy} r={r * 2 + 4} fill="none" stroke="#f59e0b" strokeWidth={0.5} opacity={0.3} />
    </svg>
  );
}

function VesicaPiscisSVG() {
  const cx = 120, cy = 120, r = 50, offset = 25;

  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      <circle cx={cx - offset} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.7} />
      <circle cx={cx + offset} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.7} />
      {/* Vertical axis through intersection */}
      <line x1={cx} y1={cy - r + 5} x2={cx} y2={cy + r - 5} stroke="#f59e0b" strokeWidth={0.5} opacity={0.3} />
    </svg>
  );
}

function DefaultMandalaSVG({ coordinates }: { coordinates?: unknown }) {
  const cx = 120, cy = 120;

  // If coordinate points are provided, render them connected
  if (Array.isArray(coordinates) && coordinates.length > 1) {
    const pts = coordinates as [number, number][];
    // Scale points to fit within 200x200 area
    const xs = pts.map(p => p[0]);
    const ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min(180 / rangeX, 180 / rangeY);
    const scaled = pts.map(([x, y]) => [
      (x - minX) * scale + (240 - rangeX * scale) / 2,
      (y - minY) * scale + (240 - rangeY * scale) / 2,
    ] as [number, number]);

    const pathD = scaled.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';

    return (
      <svg viewBox="0 0 240 240" className="w-full h-full">
        <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.7} />
        {scaled.map(([x, y], i) => (
          <circle key={`p-${i}`} cx={x} cy={y} r={3} fill="#f59e0b" opacity={0.5} />
        ))}
      </svg>
    );
  }

  // Default: concentric circles with radial lines (mandala)
  const radii = [25, 45, 65, 85];
  const radialCount = 12;

  return (
    <svg viewBox="0 0 240 240" className="w-full h-full">
      {radii.map((r, i) => (
        <circle key={`ring-${i}`} cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={0.7} opacity={0.3 + i * 0.15} />
      ))}
      {Array.from({ length: radialCount }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / radialCount;
        const x2 = cx + 90 * Math.cos(angle);
        const y2 = cy + 90 * Math.sin(angle);
        return (
          <line key={`rad-${i}`} x1={cx} y1={cy} x2={x2} y2={y2} stroke="#f59e0b" strokeWidth={0.5} opacity={0.25} />
        );
      })}
      <circle cx={cx} cy={cy} r={3} fill="#f59e0b" opacity={0.6} />
    </svg>
  );
}

/** Select the right SVG renderer based on pattern name */
function GeometrySVG({ pattern, coordinates }: { pattern: string; coordinates?: unknown }) {
  const key = pattern.toLowerCase().replace(/[^a-z]/g, '');
  if (key.includes('floweroflife')) return <FlowerOfLifeSVG />;
  if (key.includes('metatron')) return <MetatronsCubeSVG />;
  if (key.includes('sriyantra')) return <SriYantraSVG />;
  if (key.includes('seedoflife')) return <SeedOfLifeSVG />;
  if (key.includes('vesicapiscis')) return <VesicaPiscisSVG />;
  return <DefaultMandalaSVG coordinates={coordinates} />;
}

/* ── Property Card sub-component ──────────────────────────────────── */
function PropertyCard({ value, label, dotColor }: { value: string; label: string; dotColor?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-pip-border bg-pip-dark">
      <div className="flex items-center gap-1.5">
        {dotColor && <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: dotColor }} />}
        <span className="text-base font-bold text-pip-text-primary">{value}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium">{label}</span>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────── */
export function SacredGeometryResult({ result }: { result: EngineOutput }) {
  if (!result) {
    return (
      <div className="mystic-panel !p-6 text-center text-pip-text-muted">
        No sacred geometry data available.
      </div>
    );
  }

  const data = result.result as Record<string, unknown>;

  /* ── Extract fields with alias fallbacks ─────────────────────── */
  const pattern = String(getField(data, 'pattern', 'geometry_type', 'type') ?? 'Unknown Pattern');
  const frequency = getField(data, 'frequency', 'base_frequency', 'hz');
  const harmonicRatios = getField(data, 'harmonic_ratios', 'ratios', 'harmonics') as unknown[] | null;
  const symmetry = getField(data, 'symmetry_order', 'fold_symmetry', 'symmetry');
  const colorFreq = getField(data, 'color_frequency', 'color', 'color_wavelength');
  const platonicSolid = getField(data, 'platonic_solid', 'solid', 'associated_solid');
  const chakra = getField(data, 'chakra', 'energy_center', 'associated_chakra');
  const description = getField(data, 'description', 'meaning', 'interpretation');
  const coordinates = getField(data, 'coordinates', 'points', 'geometry_points');

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

      {/* Engine Badge */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs border border-pip-border/50 bg-black/20 text-pip-text-secondary flex items-center gap-1.5">
          <Hexagon className="w-3 h-3" />
          {result.engine_id}
        </span>
        <span className="px-3 py-1 rounded-full text-xs border border-pip-gold/30 bg-pip-gold/10 text-pip-gold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Level {result.consciousness_level}
        </span>
      </div>

      {/* Geometry SVG Visualization */}
      <div className="mystic-panel !p-4">
        <div className="mystic-eyebrow text-xs mb-3 flex items-center gap-1.5">
          <Hexagon className="w-3.5 h-3.5 text-pip-text-muted" />
          {pattern}
        </div>
        <div className="flex justify-center">
          <div className="w-60 h-60 bg-black/20 rounded-xl flex items-center justify-center overflow-hidden">
            <GeometrySVG pattern={pattern} coordinates={coordinates} />
          </div>
        </div>
      </div>

      {/* Frequency Card */}
      {frequency !== null && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-3 flex items-center gap-1.5">
            <Waves className="w-3.5 h-3.5 text-pip-text-muted" />
            Frequency Resonance
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl font-bold text-pip-gold">{String(frequency)}</span>
              <span className="text-xs uppercase tracking-wider text-pip-text-muted">Hz</span>
            </div>
            {!!colorFreq && (
              <div className="flex flex-col items-center gap-1 px-4 border-l border-pip-border/30">
                <span className="text-lg font-medium text-pip-text-primary">{String(colorFreq)}</span>
                <span className="text-[10px] uppercase tracking-wider text-pip-text-muted">Color Frequency</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Harmonic Ratios */}
      {Array.isArray(harmonicRatios) && harmonicRatios.length > 0 && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-3">Harmonic Ratios</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {harmonicRatios.map((ratio, i) => {
              const label = typeof ratio === 'object' && ratio !== null
                ? (ratio as Record<string, unknown>).label ?? (ratio as Record<string, unknown>).ratio ?? JSON.stringify(ratio)
                : String(ratio);
              return (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full text-sm border border-pip-gold/30 bg-pip-gold/10 text-pip-gold font-medium"
                >
                  {String(label)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Properties Grid */}
      <div className="mystic-panel !p-4">
        <div className="mystic-eyebrow text-xs mb-3">Properties</div>
        <div className="grid grid-cols-2 gap-3">
          <PropertyCard
            value={symmetry !== null ? `${String(symmetry)}-fold` : '—'}
            label="Symmetry Order"
          />
          <PropertyCard
            value={platonicSolid !== null ? String(platonicSolid) : '—'}
            label="Platonic Solid"
          />
          <PropertyCard
            value={chakra !== null ? String(chakra) : '—'}
            label="Chakra"
            dotColor={chakra ? getChakraColor(String(chakra)) : undefined}
          />
          <PropertyCard
            value={pattern}
            label="Pattern Type"
          />
        </div>
      </div>

      {/* Description / Interpretation */}
      {description !== null && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-3">Interpretation</div>
          <p className="text-sm text-pip-text-secondary leading-relaxed">
            {String(description)}
          </p>
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
