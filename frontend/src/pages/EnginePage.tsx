/**
 * EnginePage
 * Individual engine view with birth data input form and result display
 */
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, ShieldAlert, WifiOff } from 'lucide-react';
import { useEngine } from '../hooks/useEngine';
import { EngineResultRenderer } from '../components/Engines/EngineResultRenderer';
import { useAppState } from '../context/appState';
import type { EngineInput, BirthData } from '../types/selemene';

const DEFAULT_BIRTH_DATA: BirthData = {
  date: '',
  time: '',
  latitude: 0,
  longitude: 0,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export function EnginePage() {
  const { engineId } = useParams<{ engineId: string }>();
  const navigate = useNavigate();
  const { result, isLoading, error, calculate, reset, isConnected } = useEngine(engineId ?? '');
  const { state, setBirthData: setGlobalBirthData } = useAppState();

  // Initialize from global birth data, fall back to defaults
  const [birthData, setBirthData] = useState<BirthData>(() =>
    state.birthData ?? { ...DEFAULT_BIRTH_DATA }
  );

  // Use global birth data as source of truth, with local override for editing
  const effectiveBirthData = birthData.date ? birthData : (state.birthData ?? birthData);

  const handleFieldChange = useCallback((field: keyof BirthData, value: string | number) => {
    setBirthData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCalculate = useCallback(() => {
    if (!effectiveBirthData.date) return;

    // Save birth data globally (triggers Supabase + Selemene sync)
    setGlobalBirthData(effectiveBirthData);

    const input: EngineInput = {
      birth_data: {
        ...effectiveBirthData,
        latitude: Number(effectiveBirthData.latitude),
        longitude: Number(effectiveBirthData.longitude),
      },
    };
    calculate(input);
  }, [effectiveBirthData, calculate, setGlobalBirthData]);

  const handleReset = useCallback(() => {
    setBirthData({ ...DEFAULT_BIRTH_DATA });
    reset();
  }, [reset]);

  // Not connected
  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="mystic-panel !p-8 max-w-md text-center flex flex-col items-center gap-4">
          <WifiOff className="w-10 h-10 text-pip-warning" />
          <h2 className="mystic-section-title text-lg">Not Connected</h2>
          <p className="text-sm text-pip-text-secondary">
            Connect to Selemene API to run calculations.
          </p>
        </div>
      </div>
    );
  }

  // Check for phase-denied error
  const isPhaseDenied = error && String(error).toLowerCase().includes('phase');

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 overflow-auto p-1">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/engines')}
          className="mystic-btn mystic-btn-ghost !p-2"
          aria-label="Back to engines"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="mystic-section-title text-lg font-mono">{engineId}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4 min-h-0">
        {/* Input Form */}
        <div className="mystic-panel !p-5 flex flex-col gap-4 h-fit">
          <div className="mystic-eyebrow text-xs">Birth Data Input</div>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-pip-text-muted">Date</span>
              <input
                type="date"
                value={effectiveBirthData.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pip-gold/50"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-pip-text-muted">Time</span>
              <input
                type="time"
                value={effectiveBirthData.time ?? ''}
                onChange={(e) => handleFieldChange('time', e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pip-gold/50"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-pip-text-muted">Latitude</span>
                <input
                  type="number"
                  step="any"
                  value={effectiveBirthData.latitude}
                  onChange={(e) => handleFieldChange('latitude', parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pip-gold/50"
                  placeholder="28.6139"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-pip-text-muted">Longitude</span>
                <input
                  type="number"
                  step="any"
                  value={effectiveBirthData.longitude}
                  onChange={(e) => handleFieldChange('longitude', parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pip-gold/50"
                  placeholder="77.2090"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-pip-text-muted">Timezone</span>
              <input
                type="text"
                value={effectiveBirthData.timezone}
                onChange={(e) => handleFieldChange('timezone', e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pip-gold/50"
                placeholder="Asia/Kolkata"
              />
            </label>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={isLoading || !effectiveBirthData.date}
              className="mystic-btn mystic-btn-primary !px-4 !py-2 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                'Calculate'
              )}
            </button>
            {result && (
              <button
                type="button"
                onClick={handleReset}
                className="mystic-btn mystic-btn-ghost !px-4 !py-2"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Result Area */}
        <div className="min-h-0 overflow-auto">
          {isLoading && !result && (
            <div className="mystic-panel !p-8 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-pip-gold animate-spin" />
            </div>
          )}

          {isPhaseDenied && (
            <div className="mystic-panel !p-6 flex flex-col items-center gap-4 text-center">
              <ShieldAlert className="w-10 h-10 text-pip-warning" />
              <h3 className="mystic-section-title text-base">Phase Access Denied</h3>
              <p className="text-sm text-pip-text-secondary">
                This engine requires a higher consciousness level than your current phase grants.
                Continue your practice to unlock deeper engines.
              </p>
            </div>
          )}

          {error && !isPhaseDenied && (
            <div className="mystic-panel !p-6 flex flex-col items-center gap-4 text-center">
              <AlertCircle className="w-10 h-10 text-pip-warning" />
              <h3 className="mystic-section-title text-base">Calculation Error</h3>
              <p className="text-sm text-pip-text-secondary">{String(error)}</p>
            </div>
          )}

          {result && !error && (
            <EngineResultRenderer engineId={engineId ?? ''} result={result} />
          )}

          {!result && !error && !isLoading && (
            <div className="mystic-panel !p-8 text-center">
              <p className="text-sm text-pip-text-muted">
                Enter birth data and click Calculate to generate a reading.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
