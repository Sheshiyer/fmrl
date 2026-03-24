/**
 * GlassmorphicCard
 * Semi-transparent dark panel with backdrop-blur, subtle border glow,
 * and optional gold accent line. WitnessOS design system component.
 *
 * Wraps the existing `mystic-panel` / `glass-card` aesthetic with
 * WitnessOS-specific enhancements: configurable gold accent line,
 * size variants, and interactive states via Tailwind v4 theme tokens.
 *
 * Theme tokens used (defined in @theme block of index.css):
 *   pip-glass, pip-glass-border, pip-glass-hover,
 *   pip-sacred, pip-sacred-dim, pip-sacred-line
 */
import type { ReactNode } from 'react';

interface GlassmorphicCardProps {
  children: ReactNode;
  /** Visual variant */
  variant?: 'panel' | 'card' | 'elevated';
  /** Show gold accent line on top or left edge */
  accent?: boolean;
  /** Accent position */
  accentPosition?: 'top' | 'left';
  /** Hover effect */
  hoverable?: boolean;
  /** Additional classes */
  className?: string;
  /** Click handler (makes it interactive — renders as button) */
  onClick?: () => void;
}

const BASE_CLASSES = {
  panel:
    'rounded-[1.4rem] border border-pip-glass-border bg-pip-glass backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.58)]',
  card:
    'rounded-2xl border border-pip-glass-border bg-pip-glass backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
  elevated:
    'rounded-2xl border border-pip-sacred-dim bg-pip-glass backdrop-blur-xl shadow-[0_14px_38px_rgba(0,0,0,0.45),0_0_26px_rgba(245,158,11,0.06)]',
} as const;

const HOVER_CLASSES =
  'transition-all duration-200 hover:border-pip-sacred-line hover:bg-pip-glass-hover hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(0,0,0,0.45),0_0_20px_rgba(245,158,11,0.08)] cursor-pointer';

function AccentBar({ position }: { position: 'top' | 'left' }) {
  const layout =
    position === 'top'
      ? 'top-0 left-6 right-6 h-px'
      : 'top-6 bottom-6 left-0 w-px';

  const gradient =
    position === 'top'
      ? 'bg-gradient-to-r from-transparent via-pip-sacred to-transparent'
      : 'bg-gradient-to-b from-transparent via-pip-sacred to-transparent';

  return <div className={`absolute ${layout} ${gradient}`} />;
}

export function GlassmorphicCard({
  children,
  variant = 'card',
  accent = false,
  accentPosition = 'top',
  hoverable = false,
  className = '',
  onClick,
}: GlassmorphicCardProps) {
  const classes = [
    'relative overflow-hidden',
    BASE_CLASSES[variant],
    hoverable ? HOVER_CLASSES : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {accent && <AccentBar position={accentPosition} />}
        {children}
      </button>
    );
  }

  return (
    <div className={classes}>
      {accent && <AccentBar position={accentPosition} />}
      {children}
    </div>
  );
}
