/**
 * SacredGeometryOverlay
 * Decorative sacred geometry mandala rendered as semi-transparent SVG background.
 * WitnessOS branding element — thin gold line art.
 *
 * Usage:
 *   <SacredGeometryOverlay variant="flower-of-life" className="absolute inset-0" />
 *
 * Renders pointer-events-none, aria-hidden, purely decorative.
 */

// ---------------------------------------------------------------------------
// Sub-components (internal)
// ---------------------------------------------------------------------------

/** Classic Flower of Life — center + 6 first-ring + 12 second-ring circles */
function FlowerOfLife({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const circles: { x: number; y: number }[] = [{ x: cx, y: cy }];

  // First ring: 6 circles at radius r from center
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 * Math.PI) / 180;
    circles.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }

  // Second ring: 6 circles at 2r distance (aligned with first ring)
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 * Math.PI) / 180;
    circles.push({
      x: cx + 2 * r * Math.cos(angle),
      y: cy + 2 * r * Math.sin(angle),
    });
  }

  // Second ring offset: 6 circles between first-ring positions at √3·r
  for (let i = 0; i < 6; i++) {
    const angle = ((i * 60 + 30) * Math.PI) / 180;
    circles.push({
      x: cx + r * Math.sqrt(3) * Math.cos(angle),
      y: cy + r * Math.sqrt(3) * Math.sin(angle),
    });
  }

  return (
    <g stroke="#f59e0b" strokeWidth={0.5} fill="none">
      {circles.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={r} />
      ))}
      {/* Outer bounding circle */}
      <circle cx={cx} cy={cy} r={r * 3} strokeWidth={0.3} />
    </g>
  );
}

/** Seed of Life — the inner 7 circles (center + first ring) with bounding circle */
function SeedOfLife({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const circles = [{ x: cx, y: cy }];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 * Math.PI) / 180;
    circles.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }

  return (
    <g stroke="#f59e0b" strokeWidth={0.5} fill="none">
      {circles.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={r} />
      ))}
      <circle cx={cx} cy={cy} r={r * 2} strokeWidth={0.3} />
    </g>
  );
}

/** Simplified Sri Yantra — 5 downward + 4 upward nested triangles, 2 circles, bindu */
function SriYantra({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  const s = size * 0.35;
  const triangles: { points: string }[] = [];

  // Downward-pointing triangles (5) at decreasing sizes
  for (let i = 0; i < 5; i++) {
    const scale = 1 - i * 0.18;
    const offset = i * 2;
    const top = cy - s * scale + offset;
    const bottom = cy + s * scale * 0.7 - offset;
    const halfWidth = s * scale * 0.85;
    triangles.push({
      points: `${cx},${bottom} ${cx - halfWidth},${top} ${cx + halfWidth},${top}`,
    });
  }

  // Upward-pointing triangles (4) at decreasing sizes
  for (let i = 0; i < 4; i++) {
    const scale = 0.9 - i * 0.18;
    const offset = i * 2;
    const top = cy - s * scale * 0.7 + offset;
    const bottom = cy + s * scale - offset;
    const halfWidth = s * scale * 0.85;
    triangles.push({
      points: `${cx},${top} ${cx - halfWidth},${bottom} ${cx + halfWidth},${bottom}`,
    });
  }

  return (
    <g stroke="#f59e0b" strokeWidth={0.5} fill="none">
      {triangles.map((t, i) => (
        <polygon key={i} points={t.points} />
      ))}
      {/* Concentric bounding circles */}
      <circle cx={cx} cy={cy} r={s * 1.1} strokeWidth={0.3} />
      <circle cx={cx} cy={cy} r={s * 1.2} strokeWidth={0.3} />
      {/* Bindu — central point */}
      <circle cx={cx} cy={cy} r={2} fill="#f59e0b" stroke="none" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface SacredGeometryOverlayProps {
  /** Which sacred geometry pattern to render */
  variant?: 'flower-of-life' | 'sri-yantra' | 'seed-of-life';
  /** Opacity 0–1, default 0.04 for subtle background wash */
  opacity?: number;
  /** SVG canvas size in px, default 400 */
  size?: number;
  /** Additional className for positioning (e.g. "absolute inset-0") */
  className?: string;
}

export function SacredGeometryOverlay({
  variant = 'flower-of-life',
  opacity = 0.04,
  size = 400,
  className = '',
}: SacredGeometryOverlayProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.15; // Circle radius relative to canvas size

  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {variant === 'flower-of-life' && (
          <FlowerOfLife cx={cx} cy={cy} r={r} />
        )}
        {variant === 'sri-yantra' && (
          <SriYantra cx={cx} cy={cy} size={size} />
        )}
        {variant === 'seed-of-life' && (
          <SeedOfLife cx={cx} cy={cy} r={r} />
        )}
      </svg>
    </div>
  );
}
