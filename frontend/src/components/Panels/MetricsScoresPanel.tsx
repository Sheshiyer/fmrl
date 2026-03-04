import React, { useMemo, useState } from 'react';
import { ScoreTile } from '../Cards/ScoreTile';
import { LiveMetricsCard } from '../Cards/LiveMetricsCard';
import { SymmetrySnapshotCard, type SymmetrySnapshotData } from '../Cards/SymmetrySnapshotCard';

export interface Scores {
  energy: number;
  symmetry: number;
  coherence: number;
  complexity: number;
  regulation: number;
  colorBalance: number;
}

export interface Metrics {
  lqd: number;
  avgIntensity: number;
  innerNoise: number;
  fractalDim: number;
  hurstExp: number;
  horizontalSymmetry: number;
  verticalSymmetry: number;
}

interface MetricsScoresPanelProps {
  scores?: Scores;
  metrics?: Metrics;
  isBackendConnected?: boolean;
}

type RailTab = 'scores' | 'telemetry' | 'symmetry';

const getLabel = (score: number): string => {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Moderate';
  if (score >= 50) return 'Fair';
  return 'Low';
};

const getTrend = (score: number): 'up' | 'down' | 'stable' => {
  if (score >= 75) return 'up';
  if (score <= 55) return 'down';
  return 'stable';
};

export const MetricsScoresPanel: React.FC<MetricsScoresPanelProps> = ({
  scores = { energy: 78, symmetry: 85, coherence: 62, complexity: 71, regulation: 76, colorBalance: 92 },
  metrics = { lqd: 0.84, avgIntensity: 142, innerNoise: 12.4, fractalDim: 1.62, hurstExp: 0.72, horizontalSymmetry: 0.5, verticalSymmetry: 0.5 },
  isBackendConnected = false,
}) => {
  const [activeTab, setActiveTab] = useState<RailTab>('scores');

  const symmetrySnapshotData: SymmetrySnapshotData = useMemo(
    () => ({
      innerSymmetry: Math.round(metrics.horizontalSymmetry * 100),
      outerSymmetry: Math.round(metrics.verticalSymmetry * 100),
    }),
    [metrics.horizontalSymmetry, metrics.verticalSymmetry],
  );

  const tabClass = (tab: RailTab) =>
    `mystic-rail-tab ${activeTab === tab ? 'is-active' : ''}`;

  return (
    <div className="mystic-rail-stack h-full flex flex-col gap-3 sm:gap-4 overflow-visible lg:overflow-y-auto pr-0 lg:pr-1">
      <section className="mystic-panel !p-3 sm:!p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="mystic-eyebrow">Consciousness Rail</span>
          <span className="mystic-badge !text-[10px] !px-2.5 !py-1 uppercase tracking-[0.16em]">Live</span>
        </div>

        <div className="mystic-rail-tabs grid grid-cols-3 gap-1.5">
          <button type="button" onClick={() => setActiveTab('scores')} className={tabClass('scores')}>Scores</button>
          <button type="button" onClick={() => setActiveTab('telemetry')} className={tabClass('telemetry')}>Telemetry</button>
          <button type="button" onClick={() => setActiveTab('symmetry')} className={tabClass('symmetry')}>Symmetry</button>
        </div>

        {activeTab === 'scores' && (
          <>
            {!isBackendConnected && (
              <div className="mystic-status border-amber-400/35 bg-amber-500/10 text-amber-100 text-[11px] sm:text-xs leading-relaxed">
                <span className="font-semibold tracking-[0.16em] uppercase text-[10px] mr-2">Preview Mode</span>
                Scores are estimated from local frame analysis. Start backend runtime for full nonlinear pipeline accuracy.
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <ScoreTile title="Energy" score={scores.energy} trend={getTrend(scores.energy)} label={getLabel(scores.energy)} />
              <ScoreTile title="Symmetry" score={scores.symmetry} trend={getTrend(scores.symmetry)} label={getLabel(scores.symmetry)} />
              <ScoreTile title="Coherence" score={scores.coherence} trend={getTrend(scores.coherence)} label={getLabel(scores.coherence)} />
              <ScoreTile title="Complexity" score={scores.complexity} trend={getTrend(scores.complexity)} label={getLabel(scores.complexity)} />
              <ScoreTile title="Regulation" score={scores.regulation} trend={getTrend(scores.regulation)} label={getLabel(scores.regulation)} />
              <ScoreTile title="Color Bal" score={scores.colorBalance} trend={getTrend(scores.colorBalance)} label={getLabel(scores.colorBalance)} />
            </div>
          </>
        )}

        {activeTab === 'telemetry' && (
          <div className="mystic-rail-module">
            <LiveMetricsCard metrics={metrics} />
          </div>
        )}

        {activeTab === 'symmetry' && (
          <div className="mystic-rail-module">
            <SymmetrySnapshotCard data={symmetrySnapshotData} />
          </div>
        )}
      </section>
    </div>
  );
};
