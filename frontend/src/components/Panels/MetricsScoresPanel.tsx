import React, { useMemo, useState } from 'react';

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

const scoreTone = (score: number): 'high' | 'mid' | 'low' => {
  if (score >= 75) return 'high';
  if (score <= 55) return 'low';
  return 'mid';
};

export const MetricsScoresPanel: React.FC<MetricsScoresPanelProps> = ({
  scores = { energy: 78, symmetry: 85, coherence: 62, complexity: 71, regulation: 76, colorBalance: 92 },
  metrics = {
    lqd: 0.84,
    avgIntensity: 142,
    innerNoise: 12.4,
    fractalDim: 1.62,
    hurstExp: 0.72,
    horizontalSymmetry: 0.5,
    verticalSymmetry: 0.5,
  },
  isBackendConnected = false,
}) => {
  const [activeTab, setActiveTab] = useState<RailTab>('scores');

  const scoreRows = useMemo(
    () => [
      { key: 'energy', label: 'Energy', value: scores.energy },
      { key: 'symmetry', label: 'Symmetry', value: scores.symmetry },
      { key: 'coherence', label: 'Coherence', value: scores.coherence },
      { key: 'complexity', label: 'Complexity', value: scores.complexity },
      { key: 'regulation', label: 'Regulation', value: scores.regulation },
      { key: 'colorBalance', label: 'Color Balance', value: scores.colorBalance },
    ],
    [scores],
  );

  const telemetryRows = useMemo(
    () => [
      { label: 'LQD', value: metrics.lqd.toFixed(2), unit: '', hint: 'Liquid coherence density' },
      { label: 'Avg Intensity', value: Math.round(metrics.avgIntensity).toString(), unit: '', hint: 'Luminance mean' },
      { label: 'Inner Noise', value: metrics.innerNoise.toFixed(1), unit: '%', hint: 'Intra-field turbulence' },
      { label: 'Fractal Dim', value: metrics.fractalDim.toFixed(2), unit: '', hint: 'Pattern complexity index' },
      { label: 'Hurst Exp', value: metrics.hurstExp.toFixed(2), unit: '', hint: 'Long-range dependency' },
    ],
    [metrics],
  );

  const symmetry = useMemo(() => {
    const inner = Math.round(metrics.horizontalSymmetry * 100);
    const outer = Math.round(metrics.verticalSymmetry * 100);
    const delta = Math.abs(inner - outer);
    return { inner, outer, delta };
  }, [metrics.horizontalSymmetry, metrics.verticalSymmetry]);

  const tabClass = (tab: RailTab) => `mystic-rail-tab ${activeTab === tab ? 'is-active' : ''}`;

  return (
    <div className="mystic-rail-stack h-full min-h-0 flex flex-col gap-2 pr-0 lg:pr-1">
      <section className="mystic-panel !p-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="mystic-eyebrow">Consciousness Rail</span>
          <span className="mystic-badge !text-[10px] !px-2.5 !py-1 uppercase tracking-[0.16em]">Live</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <article className="mystic-status !p-1.5" aria-label={`Energy: ${scores.energy}`}>
            <div className="mystic-data-label text-[9px]">Energy</div>
            <div className="mystic-data-value text-sm leading-none mt-1">{scores.energy}</div>
          </article>
          <article className="mystic-status !p-1.5" aria-label={`Symmetry: ${scores.symmetry}`}>
            <div className="mystic-data-label text-[9px]">Symmetry</div>
            <div className="mystic-data-value text-sm leading-none mt-1">{scores.symmetry}</div>
          </article>
          <article className="mystic-status !p-1.5" aria-label={`Coherence: ${scores.coherence}`}>
            <div className="mystic-data-label text-[9px]">Coherence</div>
            <div className="mystic-data-value text-sm leading-none mt-1">{scores.coherence}</div>
          </article>
        </div>
      </section>

      <section className="mystic-panel !p-2 flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
        <div role="tablist" aria-label="Metrics views" className="mystic-rail-tabs grid grid-cols-3 gap-1.5">
          <button type="button" role="tab" id="tab-scores" aria-selected={activeTab === 'scores'} aria-controls="tabpanel-scores" onClick={() => setActiveTab('scores')} className={tabClass('scores')}>Scores</button>
          <button type="button" role="tab" id="tab-telemetry" aria-selected={activeTab === 'telemetry'} aria-controls="tabpanel-telemetry" onClick={() => setActiveTab('telemetry')} className={tabClass('telemetry')}>Telemetry</button>
          <button type="button" role="tab" id="tab-symmetry" aria-selected={activeTab === 'symmetry'} aria-controls="tabpanel-symmetry" onClick={() => setActiveTab('symmetry')} className={tabClass('symmetry')}>Symmetry</button>
        </div>

        <div className="mystic-rail-body overflow-hidden">
          {activeTab === 'scores' && (
            <div role="tabpanel" id="tabpanel-scores" aria-labelledby="tab-scores" className="mystic-tab-card flex flex-col gap-2">
              {!isBackendConnected && (
                <div className="mystic-status border-amber-400/35 bg-amber-500/10 text-amber-100 text-[11px] sm:text-xs leading-relaxed">
                  <span className="font-semibold tracking-[0.16em] uppercase text-[10px] mr-2">Preview Mode</span>
                  Scores are estimated from local frame analysis.
                </div>
              )}

              <div className="mystic-score-grid grid grid-cols-2 gap-1.5">
                {scoreRows.map((row) => (
                  <article key={row.key} className={`mystic-score-card tone-${scoreTone(row.value)}`} aria-label={`${row.label} score: ${row.value} out of 100`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="mystic-data-label text-[10px]">{row.label}</span>
                      <span className="mystic-data-value text-lg leading-none" aria-hidden="true">{row.value}</span>
                    </div>
                    <div className="mystic-score-meter" role="meter" aria-label={`${row.label} level`} aria-valuenow={row.value} aria-valuemin={0} aria-valuemax={100}>
                      <span style={{ width: `${row.value}%` }} />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'telemetry' && (
            <div role="tabpanel" id="tabpanel-telemetry" aria-labelledby="tab-telemetry" className="mystic-tab-card">
              <div className="mystic-telemetry-list">
                {telemetryRows.map((row) => (
                  <article key={row.label} className="mystic-telemetry-row">
                    <div className="flex flex-col gap-0.5">
                      <span className="mystic-data-label text-[10px]">{row.label}</span>
                      <span className="text-[10px] text-pip-text-muted">{row.hint}</span>
                    </div>
                    <div className="text-right">
                      <span className="mystic-data-value text-xl leading-none">{row.value}</span>
                      {row.unit && <span className="text-xs text-pip-text-muted ml-1">{row.unit}</span>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'symmetry' && (
            <div role="tabpanel" id="tabpanel-symmetry" aria-labelledby="tab-symmetry" className="mystic-tab-card flex flex-col gap-2.5">
              <div className="mystic-symmetry-hero">
                <div>
                  <span className="mystic-data-label text-[10px]">Bilateral Stability</span>
                  <p className="text-xs text-pip-text-muted mt-1">Inner and outer field alignment across mirror axis.</p>
                </div>
                <span className={`mystic-badge !text-[10px] !px-2.5 !py-1 ${symmetry.delta <= 8 ? 'is-success' : 'is-warning'}`}>
                  Δ {symmetry.delta}%
                </span>
              </div>

              <article className="mystic-symmetry-card">
                <div className="mystic-symmetry-row">
                  <span className="mystic-data-label text-[10px]">Inner Body</span>
                  <span className="mystic-data-value text-lg">{symmetry.inner}%</span>
                </div>
                <div className="mystic-score-meter">
                  <span style={{ width: `${symmetry.inner}%` }} />
                </div>
              </article>

              <article className="mystic-symmetry-card">
                <div className="mystic-symmetry-row">
                  <span className="mystic-data-label text-[10px]">Outer Field</span>
                  <span className="mystic-data-value text-lg">{symmetry.outer}%</span>
                </div>
                <div className="mystic-score-meter">
                  <span style={{ width: `${symmetry.outer}%` }} />
                </div>
              </article>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
