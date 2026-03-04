import React, { useState } from 'react';
import { GlassCard } from '../Cards/GlassCard';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

export interface TimelineDataPoint {
  time: number;
  energy: number;
  symmetry: number;
  coherence?: number;
}

interface TimelineStripProps {
  data?: TimelineDataPoint[];
  sessionDuration?: number;
}

const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

export const TimelineStrip: React.FC<TimelineStripProps> = ({ data = [], sessionDuration = 0 }) => {
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(new Set(['energy', 'symmetry', 'coherence']));

  const toggleMetric = (metric: string) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(metric)) next.delete(metric);
      else next.add(metric);
      return next;
    });
  };

  const chartData =
    data.length > 0
      ? data
      : Array.from({ length: 30 }, (_, i) => ({
          time: i,
          energy: 50,
          symmetry: 50,
          coherence: 50,
        }));

  const metricChipClass = (enabled: boolean, enabledClass: string) =>
    `mystic-badge !text-[10px] !px-2.5 !py-1 transition-colors ${enabled ? enabledClass : '!border-pip-border/55 !text-pip-text-muted !bg-[rgba(8,12,24,0.72)] hover:!text-pip-text-secondary'}`;

  return (
    <GlassCard className="mystic-timeline min-h-[112px] sm:min-h-[128px] w-full !p-3 sm:!p-4 rounded-xl">
      <div className="grid grid-cols-1 md:grid-cols-[170px_minmax(0,1fr)_140px] items-center gap-3 sm:gap-4 h-full">
        <div className="flex flex-col gap-2">
          <span className="mystic-eyebrow">Session Timeline</span>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => toggleMetric('energy')} className={metricChipClass(visibleMetrics.has('energy'), 'is-success')}>
              Energy
            </button>
            <button onClick={() => toggleMetric('symmetry')} className={metricChipClass(visibleMetrics.has('symmetry'), 'is-warning')}>
              Symmetry
            </button>
            <button onClick={() => toggleMetric('coherence')} className={metricChipClass(visibleMetrics.has('coherence'), '')}>
              Coherence
            </button>
          </div>
        </div>

        <div className="h-[64px] sm:h-[72px] border-x border-pip-border/40 px-2 sm:px-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <YAxis hide domain={[0, 100]} />
              {visibleMetrics.has('energy') && <Line type="monotone" dataKey="energy" stroke="#8d6dff" strokeWidth={1.95} strokeOpacity={0.96} dot={false} isAnimationActive={false} />}
              {visibleMetrics.has('symmetry') && <Line type="monotone" dataKey="symmetry" stroke="#2ec7a7" strokeWidth={1.95} strokeOpacity={0.95} dot={false} isAnimationActive={false} />}
              {visibleMetrics.has('coherence') && <Line type="monotone" dataKey="coherence" stroke="#d8b36a" strokeWidth={1.85} strokeOpacity={0.9} dot={false} isAnimationActive={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col justify-center items-start md:items-end gap-1">
          <span className="mystic-eyebrow">Session</span>
          <span className="text-base sm:text-xl mystic-data-value">{formatDuration(sessionDuration)}</span>
        </div>
      </div>
    </GlassCard>
  );
};
