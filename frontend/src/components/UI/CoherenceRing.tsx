/**
 * CoherenceRing
 * Circular SVG progress indicator with sacred geometry and teal glow.
 * Central dashboard element from WitnessOS branding.
 */

interface CoherenceRingProps {
  /** Score 0-100 */
  score: number;
  /** Label shown below score */
  label?: string;
  /** Size in px */
  size?: number;
  /** Optional className */
  className?: string;
}

export function CoherenceRing({ score, label = 'Coherence', size = 120, className = '' }: CoherenceRingProps) {
  const center = size / 2;
  const radius = size * 0.38;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;

  // Sacred geometry: 6 petal circles behind the ring
  const petalR = radius * 0.35;
  const petals = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 * Math.PI) / 180;
    return { x: center + radius * 0.6 * Math.cos(angle), y: center + radius * 0.6 * Math.sin(angle) };
  });

  // Score color: teal for high, amber for mid, red for low
  const scoreColor = progress >= 70 ? '#10b981' : progress >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="coherence-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sacred geometry petals — very subtle */}
        <g opacity={0.08}>
          {petals.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={petalR} stroke="#f59e0b" strokeWidth={0.5} fill="none" />
          ))}
          <circle cx={center} cy={center} r={radius * 0.6} stroke="#f59e0b" strokeWidth={0.3} fill="none" />
        </g>

        {/* Background track */}
        <circle
          cx={center} cy={center} r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={3}
          fill="none"
        />

        {/* Progress arc */}
        <circle
          cx={center} cy={center} r={radius}
          stroke={scoreColor}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          filter="url(#coherence-glow)"
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
        />

        {/* Center score */}
        <text
          x={center} y={center - 4}
          textAnchor="middle"
          dominantBaseline="central"
          fill={scoreColor}
          fontSize={size * 0.2}
          fontWeight={700}
          fontFamily="'SF Mono', 'JetBrains Mono', monospace"
        >
          {Math.round(progress)}
        </text>
        <text
          x={center} y={center + size * 0.12}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(170,160,143,0.56)"
          fontSize={size * 0.07}
          fontWeight={500}
          letterSpacing="0.15em"
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
