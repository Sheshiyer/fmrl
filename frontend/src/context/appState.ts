import { createContext, useContext } from 'react';
import type {
  PIPSettings,
  RealTimeMetrics,
  CompositeScores,
  MetricsHistoryEntry,
  BaselineData,
  AnalysisMode,
} from '../types';
import { DEFAULT_PIP_SETTINGS } from '../types';

export interface AppState {
  isPlaying: boolean;
  isPaused: boolean;
  pipSettings: PIPSettings;
  currentMetrics: Partial<RealTimeMetrics> | null;
  metricsHistory: MetricsHistoryEntry[];
  compositeScores: CompositeScores;
  baseline: BaselineData | null;
  analysisMode: AnalysisMode;
  isCapturing: boolean;
  showSettings: boolean;
  showHistory: boolean;
  showControls: boolean;
  isConnected: boolean;
  sessionId: string | null;
}

export type Action =
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_PAUSED'; payload: boolean }
  | { type: 'UPDATE_PIP_SETTINGS'; payload: Partial<PIPSettings> }
  | { type: 'SET_PIP_SETTING'; payload: { key: keyof PIPSettings; value: PIPSettings[keyof PIPSettings] } }
  | { type: 'SET_CURRENT_METRICS'; payload: Partial<RealTimeMetrics> }
  | { type: 'ADD_METRICS_HISTORY'; payload: MetricsHistoryEntry }
  | { type: 'SET_COMPOSITE_SCORES'; payload: Partial<CompositeScores> }
  | { type: 'SET_BASELINE'; payload: BaselineData | null }
  | { type: 'SET_ANALYSIS_MODE'; payload: AnalysisMode }
  | { type: 'SET_CAPTURING'; payload: boolean }
  | { type: 'SET_SHOW_SETTINGS'; payload: boolean }
  | { type: 'SET_SHOW_HISTORY'; payload: boolean }
  | { type: 'SET_SHOW_CONTROLS'; payload: boolean }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_SESSION_ID'; payload: string | null }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'RESET_STATE' };

export const initialState: AppState = {
  isPlaying: false,
  isPaused: false,
  pipSettings: DEFAULT_PIP_SETTINGS,
  currentMetrics: null,
  metricsHistory: [],
  compositeScores: {
    energy: 0,
    symmetry: 0,
    coherence: 0,
    complexity: 0,
    regulation: 0,
    colorBalance: 0,
  },
  baseline: null,
  analysisMode: 'fullBody',
  isCapturing: false,
  showSettings: false,
  showHistory: false,
  showControls: true,
  isConnected: false,
  sessionId: null,
};

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload, isPaused: false };
    case 'SET_PAUSED':
      return { ...state, isPaused: action.payload };
    case 'UPDATE_PIP_SETTINGS':
      return { ...state, pipSettings: { ...state.pipSettings, ...action.payload } };
    case 'SET_PIP_SETTING':
      return {
        ...state,
        pipSettings: { ...state.pipSettings, [action.payload.key]: action.payload.value },
      };
    case 'SET_CURRENT_METRICS':
      return { ...state, currentMetrics: action.payload };
    case 'ADD_METRICS_HISTORY': {
      const newHistory = [...state.metricsHistory, action.payload].slice(-300);
      return { ...state, metricsHistory: newHistory };
    }
    case 'SET_COMPOSITE_SCORES':
      return { ...state, compositeScores: { ...state.compositeScores, ...action.payload } };
    case 'SET_BASELINE':
      return { ...state, baseline: action.payload };
    case 'SET_ANALYSIS_MODE':
      return { ...state, analysisMode: action.payload };
    case 'SET_CAPTURING':
      return { ...state, isCapturing: action.payload };
    case 'SET_SHOW_SETTINGS':
      return { ...state, showSettings: action.payload };
    case 'SET_SHOW_HISTORY':
      return { ...state, showHistory: action.payload };
    case 'SET_SHOW_CONTROLS':
      return { ...state, showControls: action.payload };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    case 'CLEAR_HISTORY':
      return { ...state, metricsHistory: [] };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

export interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  updatePIPSettings: (settings: Partial<PIPSettings>) => void;
  setPIPSetting: <K extends keyof PIPSettings>(key: K, value: PIPSettings[K]) => void;
  setMetrics: (metrics: Partial<RealTimeMetrics>) => void;
  setScores: (scores: Partial<CompositeScores>) => void;
  setAnalysisMode: (mode: AnalysisMode) => void;
  toggleControls: () => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppState(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}

