/**
 * Modal to display analysis results after capture
 */
import { X, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import type { AnalysisResult, CompositeScores } from '../../types';

interface AnalysisResultModalProps {
  result: AnalysisResult;
  onClose: () => void;
  baselineScores?: CompositeScores;
}

const SCORE_CONFIG: Record<keyof CompositeScores, { label: string; color: string; description: string }> = {
  energy: {
    label: 'Energy',
    color: 'text-yellow-400',
    description: 'Overall vitality and field intensity',
  },
  symmetry: {
    label: 'Symmetry',
    color: 'text-blue-400',
    description: 'Left-right balance and harmony',
  },
  coherence: {
    label: 'Coherence',
    color: 'text-green-400',
    description: 'Pattern regularity and organization',
  },
  complexity: {
    label: 'Complexity',
    color: 'text-purple-400',
    description: 'Information richness and fractal depth',
  },
  regulation: {
    label: 'Regulation',
    color: 'text-pink-400',
    description: 'System stability and adaptability',
  },
  colorBalance: {
    label: 'Color Balance',
    color: 'text-cyan-400',
    description: 'Chromatic distribution and harmony',
  },
};

function ScoreDisplay({
  name,
  value,
  baseline,
}: {
  name: keyof CompositeScores;
  value: number;
  baseline?: number;
}) {
  const config = SCORE_CONFIG[name];
  const delta = baseline !== undefined ? value - baseline : undefined;

  const getTrendIcon = () => {
    if (delta === undefined) return null;
    if (delta > 2) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (delta < -2) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className={`font-medium ${config.color}`}>{config.label}</h4>
          <p className="text-xs text-gray-500">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-white">{value}</span>
          {getTrendIcon()}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getScoreColor(value)} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
      
      {/* Delta indicator */}
      {delta !== undefined && (
        <div className="mt-1 text-xs text-right">
          <span className={delta >= 0 ? 'text-green-400' : 'text-red-400'}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(1)} vs baseline
          </span>
        </div>
      )}
    </div>
  );
}

export function AnalysisResultModal({
  result,
  onClose,
  baselineScores,
}: AnalysisResultModalProps) {
  const handleDownload = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pip-analysis-${result.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-gray-900 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white">Analysis Results</h2>
            <p className="text-sm text-gray-400">
              {new Date(result.timestamp).toLocaleString()} | {result.mode} mode
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Images */}
          {result.images && (result.images.original || result.images.processed) && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {result.images.original && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Original</p>
                  <img
                    src={result.images.original}
                    alt="Original capture"
                    className="w-full rounded-lg"
                  />
                </div>
              )}
              {result.images.processed && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Processed</p>
                  <img
                    src={result.images.processed}
                    alt="Processed"
                    className="w-full rounded-lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* Scores Grid */}
          <h3 className="text-lg font-semibold text-white mb-4">Composite Scores</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {(Object.keys(SCORE_CONFIG) as Array<keyof CompositeScores>).map((key) => (
              <ScoreDisplay
                key={key}
                name={key}
                value={result.scores[key]}
                baseline={baselineScores?.[key]}
              />
            ))}
          </div>

          {/* Detailed Metrics (collapsible) */}
          {result.metrics && Object.keys(result.metrics).length > 0 && (
            <details className="mb-6">
              <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">
                View Detailed Metrics
              </summary>
              <pre className="mt-2 p-4 bg-gray-800 rounded-lg text-xs text-gray-300 overflow-auto max-h-60">
                {JSON.stringify(result.metrics, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 bg-gray-900 border-t border-gray-800">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download JSON
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnalysisResultModal;
