/**
 * Metrics Panel - displays all 6 composite scores
 */
import { ScoreCard } from './ScoreCard';
import { useAppState } from '../../context/appState';

const SCORE_DESCRIPTIONS: Record<string, string> = {
  energy: 'Overall energy emission intensity',
  symmetry: 'Bilateral pattern balance',
  coherence: 'Pattern organization & stability',
  complexity: 'Spatial pattern complexity',
  regulation: 'System stability & control',
  colorBalance: 'Color distribution harmony',
};

export function MetricsPanel() {
  const { state } = useAppState();
  const { compositeScores } = state;

  const scores = [
    { key: 'energy', title: 'Energy', value: compositeScores.energy },
    { key: 'symmetry', title: 'Symmetry', value: compositeScores.symmetry },
    { key: 'coherence', title: 'Coherence', value: compositeScores.coherence },
    { key: 'complexity', title: 'Complexity', value: compositeScores.complexity },
    { key: 'regulation', title: 'Regulation', value: compositeScores.regulation },
    { key: 'colorBalance', title: 'Color Balance', value: compositeScores.colorBalance },
  ];

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-semibold text-white mb-2">Composite Scores</h2>
      {scores.map((score) => (
        <ScoreCard
          key={score.key}
          title={score.title}
          value={score.value}
          description={SCORE_DESCRIPTIONS[score.key]}
        />
      ))}
    </div>
  );
}

export default MetricsPanel;
