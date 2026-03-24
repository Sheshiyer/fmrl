/**
 * IChingResult — I Ching (Book of Changes) engine renderer
 * Renders hexagram SVG, trigram breakdown, changing lines, and interpretation
 */
import { Clock, Cpu, Database, Sparkles, BookOpen, Layers, ArrowRightLeft, ScrollText } from 'lucide-react';
import type { EngineOutput } from '../../types/selemene';

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */

/** Try multiple keys (snake_case / camelCase variants) on an object */
function getField(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function str(v: unknown, fallback = '—'): string {
  return typeof v === 'string' && v.length > 0 ? v : String(v ?? fallback);
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* ────────────────────────────────────────────────────────────
   Hexagram SVG
   ──────────────────────────────────────────────────────────── */

interface LineData {
  position: number;
  type: string;
  meaning?: string;
}

/**
 * Renders a hexagram as 6 stacked horizontal lines (bottom-up).
 * viewBox: 0 0 80 120
 * Line thickness: 8px, gap between lines: 12px
 * Position 1 at bottom → y center = 110
 * Position 6 at top   → y center = 10
 */
function HexagramSVG({ lines, changingLines }: { lines: LineData[]; changingLines: number[] }) {
  // Build a map: position → line type
  const lineMap = new Map<number, string>();
  for (const l of lines) {
    lineMap.set(l.position, l.type);
  }

  // If no explicit lines, generate defaults from changing lines
  const positions = [6, 5, 4, 3, 2, 1]; // top to bottom in SVG
  const changingSet = new Set(changingLines);

  const yCenter = (pos: number) => 10 + (6 - pos) * 20; // pos 6 → y=10, pos 1 → y=110

  return (
    <svg
      viewBox="0 0 80 120"
      width={80}
      height={120}
      className="flex-shrink-0"
      aria-label="Hexagram"
    >
      {positions.map((pos) => {
        const rawType = lineMap.get(pos) ?? (pos % 2 === 1 ? 'solid' : 'broken');
        const y = yCenter(pos);
        const isChanging = rawType.startsWith('changing') || changingSet.has(pos);
        const isSolid = rawType === 'solid' || rawType === 'changing_solid';

        return (
          <g key={pos}>
            {isSolid ? (
              /* Solid line — full bar */
              <rect
                x={0} y={y - 4} width={80} height={8} rx={2}
                className="fill-pip-text-primary"
              />
            ) : (
              /* Broken line — two half-bars with center gap */
              <>
                <rect
                  x={0} y={y - 4} width={34} height={8} rx={2}
                  className="fill-pip-text-primary"
                />
                <rect
                  x={46} y={y - 4} width={34} height={8} rx={2}
                  className="fill-pip-text-primary"
                />
              </>
            )}

            {/* Gold dot on changing lines */}
            {isChanging && (
              <circle
                cx={40} cy={y} r={4}
                className="fill-pip-gold"
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={1}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────────────────────── */

export function IChingResult({ result }: { result: EngineOutput }) {
  if (!result) {
    return (
      <div className="mystic-panel !p-6 text-center text-pip-text-muted">
        No result data available.
      </div>
    );
  }

  const data = result.result as Record<string, unknown>;

  /* ── Primary hexagram ── */
  const hexObj = (getField(data, 'hexagram', 'primary_hexagram') ?? {}) as Record<string, unknown>;
  const hexNumber = num(hexObj.number, 0);
  const hexName = str(hexObj.name);
  const chineseName = str(getField(hexObj, 'chinese_name', 'chineseName'), '');
  const image = str(hexObj.image, '');
  const judgment = str(hexObj.judgment, '');

  /* ── Lines ── */
  const rawLines = (getField(data, 'lines') ?? []) as LineData[];
  const lines: LineData[] = Array.isArray(rawLines) ? rawLines : [];

  /* ── Trigrams ── */
  const upperTrigram = (getField(data, 'upper_trigram', 'trigram_above') ?? {}) as Record<string, unknown>;
  const lowerTrigram = (getField(data, 'lower_trigram', 'trigram_below') ?? {}) as Record<string, unknown>;

  /* ── Changing lines ── */
  const changingLines = (getField(data, 'changing_lines', 'changingLines') ?? []) as number[];

  /* ── Relating / nuclear hexagram ── */
  const relatingHex = (getField(data, 'relating_hexagram', 'nuclear_hexagram') ?? null) as Record<string, unknown> | null;

  /* ── Interpretation ── */
  const interpretation = str(getField(data, 'interpretation', 'reading'), '');

  /* ── Changing line details (from the lines array) ── */
  const changingLineDetails = lines.filter(
    (l) => l.type?.startsWith('changing') || changingLines.includes(l.position),
  );

  return (
    <div className="flex flex-col gap-4">

      {/* ── 1. Witness Prompt ── */}
      {result.witness_prompt && (
        <div className="mystic-panel !p-5">
          <p className="text-lg italic text-pip-gold leading-relaxed">
            &ldquo;{result.witness_prompt}&rdquo;
          </p>
        </div>
      )}

      {/* ── 2. Badges ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs border border-pip-border/50 bg-black/20 text-pip-text-secondary flex items-center gap-1.5">
          <BookOpen className="w-3 h-3" />
          {result.engine_id}
        </span>
        <span className="px-3 py-1 rounded-full text-xs border border-pip-gold/30 bg-pip-gold/10 text-pip-gold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Level {result.consciousness_level}
        </span>
        {hexNumber > 0 && (
          <span className="px-3 py-1 rounded-full text-xs border border-pip-gold/30 bg-pip-gold/10 text-pip-gold">
            Hexagram {hexNumber}
          </span>
        )}
      </div>

      {/* ── 3. Hexagram Display ── */}
      <div className="mystic-panel !p-5">
        <div className="mystic-eyebrow text-xs mb-3 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-pip-text-muted" />
          Primary Hexagram
        </div>
        <div className="flex items-start gap-6">
          {/* SVG hexagram */}
          <HexagramSVG lines={lines} changingLines={changingLines} />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 mb-1">
              {hexNumber > 0 && (
                <span className="text-3xl font-bold text-pip-gold">{hexNumber}</span>
              )}
              <span className="text-xl font-semibold text-pip-text-primary">{hexName}</span>
            </div>
            {chineseName && (
              <p className="text-sm text-pip-text-muted mb-3">{chineseName}</p>
            )}
            {image && (
              <p className="text-sm text-pip-text-secondary mb-2">
                <span className="text-pip-text-muted">Image:</span> {image}
              </p>
            )}
            {judgment && (
              <p className="text-sm text-pip-text-secondary leading-relaxed">{judgment}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Trigram Breakdown ── */}
      {(upperTrigram.name || lowerTrigram.name) && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-3 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-pip-text-muted" />
            Trigrams
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Upper */}
            <div className="rounded-lg bg-black/20 border border-pip-border/30 p-3">
              <div className="text-xs text-pip-text-muted mb-1">Upper (Above)</div>
              <div className="text-base font-semibold text-pip-text-primary">
                {str(upperTrigram.name)}
              </div>
              {upperTrigram.attribute && (
                <div className="text-xs text-pip-gold mt-1">{str(upperTrigram.attribute)}</div>
              )}
            </div>
            {/* Lower */}
            <div className="rounded-lg bg-black/20 border border-pip-border/30 p-3">
              <div className="text-xs text-pip-text-muted mb-1">Lower (Below)</div>
              <div className="text-base font-semibold text-pip-text-primary">
                {str(lowerTrigram.name)}
              </div>
              {lowerTrigram.attribute && (
                <div className="text-xs text-pip-gold mt-1">{str(lowerTrigram.attribute)}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Changing Lines ── */}
      {changingLineDetails.length > 0 && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-3 flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-pip-text-muted" />
            Changing Lines
          </div>
          <ul className="space-y-2">
            {changingLineDetails.map((cl) => (
              <li key={cl.position} className="flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-pip-gold flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-pip-gold">
                    Line {cl.position}
                  </span>
                  {cl.meaning && (
                    <p className="text-sm text-pip-text-secondary mt-0.5 leading-relaxed">
                      {cl.meaning}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 6. Relating Hexagram ── */}
      {relatingHex && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-3 flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-pip-text-muted" />
            Relating Hexagram
          </div>
          <div className="flex items-baseline gap-3">
            {relatingHex.number && (
              <span className="text-2xl font-bold text-pip-gold">
                {num(relatingHex.number)}
              </span>
            )}
            <span className="text-lg font-semibold text-pip-text-primary">
              {str(relatingHex.name)}
            </span>
            {relatingHex.chinese_name && (
              <span className="text-sm text-pip-text-muted">
                {str(relatingHex.chinese_name)}
              </span>
            )}
          </div>
          {relatingHex.judgment && (
            <p className="text-sm text-pip-text-secondary mt-2 leading-relaxed">
              {str(relatingHex.judgment)}
            </p>
          )}
        </div>
      )}

      {/* ── 7. Interpretation ── */}
      {interpretation && interpretation !== '—' && (
        <div className="mystic-panel !p-5">
          <div className="mystic-eyebrow text-xs mb-3 flex items-center gap-1.5">
            <ScrollText className="w-3.5 h-3.5 text-pip-text-muted" />
            Interpretation
          </div>
          <p className="text-sm text-pip-text-secondary leading-relaxed whitespace-pre-line">
            {interpretation}
          </p>
        </div>
      )}

      {/* ── 8. Metadata Footer ── */}
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
