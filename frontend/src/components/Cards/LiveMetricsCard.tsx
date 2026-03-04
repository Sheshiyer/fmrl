import React from 'react';
import { GlassCard } from './GlassCard';
import { Activity } from 'lucide-react';

interface MetricItemProps {
  label: string;
  value: string;
  unit?: string;
}

interface LiveMetricsCardProps {
  metrics?: {
    lqd: number;
    avgIntensity: number;
    innerNoise: number;
    fractalDim: number;
    hurstExp: number;
  };
}

const MetricRow: React.FC<MetricItemProps> = ({ label, value, unit }) => (
  <div className="flex items-center justify-between py-2 border-b border-pip-border/40 last:border-0">
    <span className="text-xs text-pip-text-secondary tracking-[0.12em] uppercase">{label}</span>
    <div className="flex items-end gap-1">
      <span className="text-sm mystic-data-value font-medium text-pip-text-primary">{value}</span>
      {unit && <span className="text-[10px] text-pip-text-muted">{unit}</span>}
    </div>
  </div>
);

export const LiveMetricsCard: React.FC<LiveMetricsCardProps> = ({
  metrics = { lqd: 0.84, avgIntensity: 142, innerNoise: 12.4, fractalDim: 1.62, hurstExp: 0.72 },
}) => {
  return (
    <GlassCard className="flex flex-col gap-2 !p-4 sm:!p-[1.125rem]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-pip-accent" />
          <h3 className="text-sm font-semibold mystic-section-title">Live Metrics</h3>
        </div>
        <span className="mystic-badge !text-[10px] !px-2 !py-0.5">Frame-derived</span>
      </div>

      <div className="flex flex-col">
        <MetricRow label="LQD" value={metrics.lqd.toFixed(2)} />
        <MetricRow label="Avg Intensity" value={Math.round(metrics.avgIntensity).toString()} />
        <MetricRow label="Inner Noise" value={metrics.innerNoise.toFixed(1)} unit="%" />
        <MetricRow label="Fractal Dim" value={metrics.fractalDim.toFixed(2)} />
        <MetricRow label="Hurst Exp" value={metrics.hurstExp.toFixed(2)} />
      </div>
    </GlassCard>
  );
};
