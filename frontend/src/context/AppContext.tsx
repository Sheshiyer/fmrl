/**
 * Application State Management Context
 */
import { useReducer } from 'react';
import type { ReactNode } from 'react';
import type { PIPSettings, RealTimeMetrics, CompositeScores, AnalysisMode } from '../types';
import { AppContext, appReducer, initialState, type AppContextValue } from './appState';

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Convenience action creators
  const setPlaying = (playing: boolean) => dispatch({ type: 'SET_PLAYING', payload: playing });
  const setPaused = (paused: boolean) => dispatch({ type: 'SET_PAUSED', payload: paused });
  const updatePIPSettings = (settings: Partial<PIPSettings>) =>
    dispatch({ type: 'UPDATE_PIP_SETTINGS', payload: settings });
  const setPIPSetting = <K extends keyof PIPSettings>(key: K, value: PIPSettings[K]) =>
    dispatch({ type: 'SET_PIP_SETTING', payload: { key, value } });
  const setMetrics = (metrics: Partial<RealTimeMetrics>) =>
    dispatch({ type: 'SET_CURRENT_METRICS', payload: metrics });
  const setScores = (scores: Partial<CompositeScores>) =>
    dispatch({ type: 'SET_COMPOSITE_SCORES', payload: scores });
  const setAnalysisMode = (mode: AnalysisMode) =>
    dispatch({ type: 'SET_ANALYSIS_MODE', payload: mode });
  const toggleControls = () =>
    dispatch({ type: 'SET_SHOW_CONTROLS', payload: !state.showControls });

  const value: AppContextValue = {
    state,
    dispatch,
    setPlaying,
    setPaused,
    updatePIPSettings,
    setPIPSetting,
    setMetrics,
    setScores,
    setAnalysisMode,
    toggleControls,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
