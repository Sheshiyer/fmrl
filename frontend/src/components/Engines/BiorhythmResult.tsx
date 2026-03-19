/**
 * BiorhythmResult Component
 * Dedicated renderer for the Biorhythm engine with a 30-day forecast chart.
 * Uses Recharts for visualization of physical, emotional, and intellectual cycles.
 */
import { useMemo } from 'react';
import { Clock, Cpu, Database, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { EngineOutput } from '../../types/selemene';

// Cycle colors
const COLORS = {
  physical: '#8d6dff',
  emotional: '#2ec7a7',
  intellectual: '#d8b36a',
} as const;

// Cycle periods in days
const PERIODS = {
  physical: 23,
  emotional: 28,
  intellectual: 33,
} as const;

interface ChartPoint {
  day: number;
  physical: number;
  emotional: number;
  intellectual: number;
}

/**
 * Generate a 30-day sine wave preview when no forecast data is provided.
 * Uses the standard biorhythm periods (23/28/33 days).
 */
function generateSinePreview(
  currentPhysical: number,
  currentEmotional: number,
  currentIntellectual: number,
): ChartPoint[] {
  const points: ChartPoint[] = [];
  // Estimate phase offsets from current values
  const phasePhysical = Math.asin(currentPhysical / 100);
  const phaseEmotional = Math.asin(currentEmotional / 100);
  const phaseIntellectual = Math.asin(currentIntellectual / 100);

  for (let d = 0; d < 30; d++) {
    points.push({
      day: d,
      physical: Math.round(Math.sin(phasePhysical + (2 * Math.PI * d) / PERIODS.physical) * 100),
      emotional: Math.round(Math.sin(phaseEmotional + (2 * Math.PI * d) / PERIODS.emotional) * 100),
      intellectual: Math.round(Math.sin(phaseIntellectual + (2 * Math.PI * d) / PERIODS.intellectual) * 100),
    });
  }
  return points;
}

function CycleBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold border-2"
        style={{ borderColor: color, color }}
      >
        {Math.round(value)}%
      </div>
      <span className="text-xs text-pip-text-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function BiorhythmResult({ result }: { result: EngineOutput }) {
  if (!result) {
    return (
      <div className="mystic-panel !p-6 text-center text-pip-text-muted">
        No result data available.
      </div>
    );
  }

  const data = result.result as Record<string, unknown>;
  const physical = Number(data.physical ?? data.physical_cycle ?? 0);
  const emotional = Number(data.emotional ?? data.emotional_cycle ?? 0);
  const intellectual = Number(data.intellectual ?? data.intellectual_cycle ?? 0);
  const rawForecast = (data.forecast ?? data.chart_data ?? []) as Array<Record<string, unknown>>;
  const criticalDays = data.critical_days as Array<Record<string, unknown>> | undefined;

  const chartData = useMemo<ChartPoint[]>(() => {
    if (rawForecast.length > 0) {
      return rawForecast.map((point, i) => ({
        day: Number(point.day ?? i),
        physical: Number(point.physical ?? point.physical_cycle ?? 0),
        emotional: Number(point.emotional ?? point.emotional_cycle ?? 0),
        intellectual: Number(point.intellectual ?? point.intellectual_cycle ?? 0),
      }));
    }
    return generateSinePreview(physical, emotional, intellectual);
  }, [rawForecast, physical, emotional, intellectual]);

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

      {/* Current Cycle Values */}
      <div className="mystic-panel !p-5">
        <div className="mystic-eyebrow text-xs mb-4">Current Cycles</div>
        <div className="flex justify-center gap-8">
          <CycleBadge label="Physical" value={physical} color={COLORS.physical} />
          <CycleBadge label="Emotional" value={emotional} color={COLORS.emotional} />
          <CycleBadge label="Intellectual" value={intellectual} color={COLORS.intellectual} />
        </div>
      </div>

      {/* 30-Day Forecast Chart */}
      <div className="mystic-panel !p-5">
        <div className="mystic-eyebrow text-xs mb-4">30-Day Forecast</div>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis
                dataKey="day"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(215,178,109,0.15)' }}
                tickLine={false}
              />
              <YAxis
                domain={[-100, 100]}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(215,178,109,0.15)' }}
                tickLine={false}
                ticks={[-100, -50, 0, 50, 100]}
              />
              <ReferenceLine
                y={0}
                stroke="rgba(215,178,109,0.3)"
                strokeDasharray="4 4"
                label={{ value: 'Critical', fill: '#d8b36a', fontSize: 10, position: 'right' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#070a12',
                  border: '1px solid rgba(215,178,109,0.24)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#9ca3af' }}
                itemStyle={{ fontSize: 12 }}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Line
                type="monotone"
                dataKey="physical"
                stroke={COLORS.physical}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Physical"
              />
              <Line
                type="monotone"
                dataKey="emotional"
                stroke={COLORS.emotional}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Emotional"
              />
              <Line
                type="monotone"
                dataKey="intellectual"
                stroke={COLORS.intellectual}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Intellectual"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Critical Days */}
      {criticalDays && criticalDays.length > 0 && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-pip-warning" />
            Critical Days
          </div>
          <div className="flex flex-wrap gap-2">
            {criticalDays.map((cd, i) => {
              const day = cd.day ?? cd.date ?? `Day ${i + 1}`;
              const cycle = cd.cycle ?? cd.type ?? 'unknown';
              const color =
                cycle === 'physical'
                  ? COLORS.physical
                  : cycle === 'emotional'
                    ? COLORS.emotional
                    : cycle === 'intellectual'
                      ? COLORS.intellectual
                      : '#9ca3af';
              return (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-xs border bg-black/20"
                  style={{ borderColor: `${color}50`, color }}
                >
                  {String(day)} &mdash; {String(cycle)}
                </span>
              );
            })}
          </div>
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
