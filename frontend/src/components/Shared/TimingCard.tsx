import type { ReactNode } from 'react';

interface TimingCardProps {
  title: string;
  primaryValue: string;
  secondaryValue?: string;
  icon: ReactNode;
  isLive?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onClick?: () => void;
}

export function TimingCard({
  title,
  primaryValue,
  secondaryValue,
  icon,
  isLive = false,
  isLoading = false,
  error,
  onClick,
}: TimingCardProps) {
  if (isLoading) {
    return (
      <div className="mystic-panel !p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-pip-border/30" />
          <div className="h-3 w-20 rounded bg-pip-border/30" />
        </div>
        <div className="h-6 w-24 rounded bg-pip-border/30 mb-2" />
        <div className="h-3 w-32 rounded bg-pip-border/20" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mystic-panel !p-4 border-pip-danger/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-pip-text-muted">{icon}</span>
          <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium">{title}</span>
        </div>
        <p className="text-xs text-pip-danger">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-lg p-4 transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-pip-sacred-line hover:bg-white/[0.05] hover:-translate-y-0.5' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {/* Subtle gold accent line at top */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-pip-sacred/20 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-pip-sacred">{icon}</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-pip-text-muted font-medium">{title}</span>
        </div>
        {isLive && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-pip-optimal animate-pulse" />
            <span className="text-[9px] uppercase tracking-wider text-pip-optimal">Live</span>
          </span>
        )}
      </div>

      {/* Primary Value */}
      <p className="text-lg font-semibold text-pip-text-primary tracking-wide mb-1">
        {primaryValue}
      </p>

      {/* Secondary Value */}
      {secondaryValue && (
        <p className="text-xs text-pip-text-secondary truncate">
          {secondaryValue}
        </p>
      )}
    </div>
  );
}
