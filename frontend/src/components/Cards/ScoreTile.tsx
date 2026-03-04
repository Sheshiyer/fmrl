import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface ScoreTileProps {
  title: string;
  score: number;
  trend?: 'up' | 'down' | 'stable';
  label?: string;
}

const scoreExplanations: Record<string, string> = {
  Energy: 'Computed from Light Quanta Density (30%), Average Intensity (25%), Total Energy (25%), and Normalized Area (20%). Higher values indicate stronger biofield presence.',
  Symmetry: 'Based on Body SSIM (50%), Contour Balance (30%), and Color Symmetry (20%). Measures bilateral balance and alignment.',
  Coherence: 'Derived from Pattern Regularity (35%), Temporal Stability (25%), Hurst Exponent (25%), and Color Coherence (15%). Indicates field organization.',
  Complexity: 'Calculated from Fractal Dimension (30%), Color Entropy (25%), Correlation Dimension (20%), Contour Complexity (15%), and Noise (10%).',
  Regulation: 'Based on Lyapunov Exponent (30%), DFA Alpha (25%), Temporal Variance (20%), Recurrence Rate (15%), and Stability (10%). Reflects adaptive capacity.',
  'Color Bal': 'Measures Color Uniformity (30%), Hue Balance (25%), Saturation Consistency (20%), Coherence (15%), and Symmetry (10%).',
  'Color Balance': 'Measures Color Uniformity (30%), Hue Balance (25%), Saturation Consistency (20%), Coherence (15%), and Symmetry (10%).',
};

export const ScoreTile: React.FC<ScoreTileProps> = ({ title, score, trend = 'stable', label }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-3 h-3 text-pip-success" />;
      case 'down':
        return <ArrowDown className="w-3 h-3 text-pip-danger" />;
      default:
        return <Minus className="w-3 h-3 text-pip-text-muted" />;
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-pip-success';
    if (s >= 50) return 'text-pip-warning';
    return 'text-pip-danger';
  };

  const getRingColor = (s: number) => {
    if (s >= 80) return 'stroke-pip-success';
    if (s >= 50) return 'stroke-pip-warning';
    return 'stroke-pip-danger';
  };

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const explanation = scoreExplanations[title] || 'Composite score based on multiple metrics.';

  return (
    <button
      className="mystic-card !p-3 sm:!p-4 !rounded-xl !cursor-pointer text-left h-full transition-transform duration-200 hover:-translate-y-0.5 hover:!border-pip-border/70"
      onClick={() => setIsFlipped((v) => !v)}
      type="button"
      style={{ perspective: '1000px' }}
      title="Click to see score explanation"
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        <div className="absolute inset-0 flex flex-col justify-between" style={{ backfaceVisibility: 'hidden' }}>
          <div className="w-full flex justify-between items-start">
            <span className="text-[10px] sm:text-xs font-medium text-pip-text-secondary uppercase tracking-[0.18em] truncate">{title}</span>
            <span>{getTrendIcon()}</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 w-full mt-2">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="24" cy="24" r={radius} className="stroke-white/10 fill-none" strokeWidth="3" />
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  className={`${getRingColor(score)} fill-none transition-all duration-700 ease-out`}
                  strokeWidth="3"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              </svg>
              <span className={`absolute text-sm font-bold ${getScoreColor(score)}`}>{score}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-medium text-pip-text-primary">{label || 'Average'}</span>
              <span className="text-[10px] text-pip-text-muted uppercase tracking-[0.14em]">Live stream</span>
            </div>
          </div>
        </div>

        <div
          className="absolute inset-0 flex items-center justify-center p-1"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="text-center">
            <h4 className="text-xs sm:text-sm font-semibold text-pip-gold mb-2 tracking-[0.08em] uppercase">{title}</h4>
            <p className="text-[10px] sm:text-[11px] text-pip-text-secondary leading-relaxed">{explanation}</p>
          </div>
        </div>
      </div>
    </button>
  );
};
