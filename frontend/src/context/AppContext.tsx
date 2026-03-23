/**
 * Application State Management Context
 */
import { useReducer, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { PIPSettings, RealTimeMetrics, CompositeScores, AnalysisMode } from '../types';
import type { BirthData } from '../types/selemene';
import { AppContext, appReducer, initialState, type AppContextValue } from './appState';
import { useAuth } from './auth/AuthContext';
import { SelemeneClient } from '../services/SelemeneClient';

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { status, user, selemeneToken, profile, updateProfile } = useAuth();
  const hydratedFromCloud = useRef(false);

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

  const setBirthData = useCallback((birthData: BirthData | null) => {
    dispatch({ type: 'SET_BIRTH_DATA', payload: birthData });

    // Persist to localStorage (offline fallback)
    if (birthData) {
      localStorage.setItem('fmrl_birth_data', JSON.stringify(birthData));
    } else {
      localStorage.removeItem('fmrl_birth_data');
    }

    // Sync to Supabase user_profiles (cloud persistence)
    if (birthData && status === 'authenticated' && user?.id) {
      updateProfile({
        birth_date: birthData.date || null,
        birth_time: birthData.time || null,
        birth_location: birthData.latitude && birthData.longitude
          ? `${birthData.latitude},${birthData.longitude}`
          : null,
        timezone: birthData.timezone || null,
      }).catch((err) => console.warn('[AppContext] Supabase profile sync failed:', err));
    }

    // Sync to Selemene Engine API profile
    if (birthData && selemeneToken) {
      const client = new SelemeneClient(
        import.meta.env.VITE_SELEMENE_API_URL ?? 'https://selemene.tryambakam.space',
        selemeneToken,
      );
      client.updateMe({
        full_name: birthData.name,
        birth_date: birthData.date,
        birth_time: birthData.time,
        birth_location_lat: birthData.latitude,
        birth_location_lng: birthData.longitude,
        timezone: birthData.timezone,
      }).catch((err) => console.warn('[AppContext] Selemene profile sync failed:', err));
    }
  }, [status, user?.id, selemeneToken, updateProfile]);

  // Restore birth data from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fmrl_birth_data');
      if (saved) {
        dispatch({ type: 'SET_BIRTH_DATA', payload: JSON.parse(saved) });
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  // Hydrate birth data from Supabase profile on login (cloud → local)
  useEffect(() => {
    if (status !== 'authenticated' || !profile || hydratedFromCloud.current) return;
    hydratedFromCloud.current = true;

    // Only hydrate if cloud has data AND local doesn't (or cloud is newer)
    if (profile.birth_date) {
      const local = localStorage.getItem('fmrl_birth_data');
      if (!local) {
        // No local data — use cloud data
        const coords = profile.birth_location?.split(',').map(Number) ?? [0, 0];
        const cloudBirthData: BirthData = {
          date: profile.birth_date,
          time: profile.birth_time || undefined,
          latitude: coords[0] || 0,
          longitude: coords[1] || 0,
          timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        dispatch({ type: 'SET_BIRTH_DATA', payload: cloudBirthData });
        localStorage.setItem('fmrl_birth_data', JSON.stringify(cloudBirthData));
        console.log('[AppContext] Hydrated birth data from Supabase profile');
      }
    }
  }, [status, profile]);

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
    setBirthData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
