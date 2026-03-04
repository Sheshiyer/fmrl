/**
 * Graph Panel - Real-time metrics time series chart
 */
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAppState } from '../../context/appState';

const COLORS = {
  energy: '#6366f1',
  symmetry: '#22c55e',
  coherence: '#eab308',
  complexity: '#f97316',
  regulation: '#06b6d4',
  colorBalance: '#ec4899',
};

export function GraphPanel() {
  const { state } = useAppState();
  const { metricsHistory, compositeScores } = state;

  // Transform history data for chart
  const chartData = useMemo(() => {
    if (metricsHistory.length === 0) {
      // Show current scores if no history
      return [{
        time: new Date().toLocaleTimeString(),
        ...compositeScores,
      }];
    }

    return metricsHistory.map((entry, index) => ({
      time: new Date(entry.timestamp).toLocaleTimeString(),
      index,
      energy: entry.scores.energy ?? 0,
      symmetry: entry.scores.symmetry ?? 0,
      coherence: entry.scores.coherence ?? 0,
      complexity: entry.scores.complexity ?? 0,
      regulation: entry.scores.regulation ?? 0,
      colorBalance: entry.scores.colorBalance ?? 0,
    }));
  }, [metricsHistory, compositeScores]);

  // Visible metrics toggle
  const [visibleMetrics, setVisibleMetrics] = React.useState<Set<string>>(
    new Set(['energy', 'symmetry', 'coherence'])
  );

  const toggleMetric = (metric: string) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(metric)) {
        next.delete(metric);
      } else {
        next.add(metric);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full p-4 bg-gray-800/30 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Real-Time Metrics</h2>
        
        {/* Metric Toggle Buttons */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(COLORS).map(([metric, color]) => (
            <button
              key={metric}
              onClick={() => toggleMetric(metric)}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                visibleMetrics.has(metric)
                  ? 'text-white'
                  : 'text-gray-500 bg-gray-700/50'
              }`}
              style={{
                backgroundColor: visibleMetrics.has(metric) ? color : undefined,
              }}
            >
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="index"
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickFormatter={(value) => `${value}s`}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Legend />
            
            {Object.entries(COLORS).map(([metric, color]) =>
              visibleMetrics.has(metric) ? (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default GraphPanel;
