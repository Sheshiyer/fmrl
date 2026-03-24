/**
 * BreathNav
 * Breathing guidance widget with animated waveform.
 * WitnessOS branding element from breathnav.png.
 */
import { useState, useEffect } from 'react';

interface BreathNavProps {
  /** Breath cycle in seconds (default: 8 — 4 in, 4 out) */
  cycleDuration?: number;
  /** Width of the waveform */
  width?: number;
  className?: string;
}

export function BreathNav({ cycleDuration = 8, width = 200, className = '' }: BreathNavProps) {
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const halfCycle = cycleDuration / 2;

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => p === 'in' ? 'out' : 'in');
    }, halfCycle * 1000);
    return () => clearInterval(interval);
  }, [halfCycle]);

  // Generate sine wave path
  const height = 40;
  const points: string[] = [];
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const y = height / 2 + Math.sin((i / steps) * Math.PI * 3) * (height * 0.3);
    points.push(`${i === 0 ? 'M' : 'L'}${x},${y}`);
  }
  const pathD = points.join(' ');

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <path
          d={pathD}
          stroke="#10b981"
          strokeWidth={1.5}
          fill="none"
          className="transition-opacity duration-1000"
          style={{ opacity: phase === 'in' ? 0.8 : 0.3 }}
        />
        {/* Animated dot traveling along the wave */}
        <circle r={3} fill="#10b981" opacity={0.9}>
          <animateMotion dur={`${cycleDuration}s`} repeatCount="indefinite" path={pathD} />
        </circle>
      </svg>
      <span
        className="text-[10px] tracking-[0.2em] uppercase transition-all duration-1000"
        style={{ color: phase === 'in' ? '#10b981' : 'rgba(170,160,143,0.56)' }}
      >
        {phase === 'in' ? 'Breathe in\u2026' : 'Breathe out\u2026'}
      </span>
    </div>
  );
}
