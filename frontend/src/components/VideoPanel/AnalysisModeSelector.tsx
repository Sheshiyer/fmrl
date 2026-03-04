/**
 * Analysis Mode Selector Component
 */
import { User, Scan, Layers } from 'lucide-react';
import { useAppState } from '../../context/appState';
import type { AnalysisMode } from '../../types';

interface ModeOption {
  mode: AnalysisMode;
  label: string;
  icon: typeof User;
  description: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'fullBody',
    label: 'Full Body',
    icon: User,
    description: 'Analyze entire body and surrounding field',
  },
  {
    mode: 'face',
    label: 'Face Only',
    icon: Scan,
    description: 'Focus on facial energy patterns',
  },
  {
    mode: 'segmented',
    label: 'Segmented',
    icon: Layers,
    description: 'Multi-zone detailed analysis',
  },
];

export function AnalysisModeSelector() {
  const { state, setAnalysisMode } = useAppState();
  const { analysisMode } = state;

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-800/50 rounded-lg">
      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        Analysis Mode
      </h4>
      <div className="flex gap-2">
        {MODE_OPTIONS.map(({ mode, label, icon: Icon, description }) => (
          <button
            key={mode}
            onClick={() => setAnalysisMode(mode)}
            className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
              analysisMode === mode
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
            title={description}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default AnalysisModeSelector;
