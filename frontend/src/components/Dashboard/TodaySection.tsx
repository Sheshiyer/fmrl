/**
 * TodaySection — Dashboard "Today" strip showing timing engine summaries
 */
import { useState } from 'react';
import { Sun, Clock, Activity, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { useTodayEngines } from '../../hooks/useTodayEngines';
import { useAppState } from '../../context/appState';
import { TimingCard } from '../Shared/TimingCard';
import { BirthDataForm } from '../Shared/BirthDataForm';
import type { BirthData } from '../../types/selemene';

function extractPrimary(result: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!result) return '—';
  for (const key of keys) {
    const val = result[key];
    if (val !== undefined && val !== null) {
      if (typeof val === 'object' && val !== null && 'name' in val) {
        return String((val as { name: unknown }).name);
      }
      return String(val);
    }
  }
  return '—';
}

export function TodaySection() {
  const { panchanga, vedicClock, biorhythm, numerology, isLoading, error, hasBirthData } = useTodayEngines();
  const { state, setBirthData } = useAppState();
  const [showForm, setShowForm] = useState(false);

  const handleSaveBirthData = (data: BirthData) => {
    setBirthData(data);
    setShowForm(false);
  };

  // No birth data — prompt to set it
  if (!hasBirthData) {
    return (
      <div className="mystic-panel !p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-pip-text-primary tracking-wide">Today</h2>
            <p className="text-xs text-pip-text-muted mt-0.5">Set your birth data to activate timing engines</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="mystic-btn mystic-btn-ghost text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg border border-pip-gold/30 text-pip-gold hover:bg-pip-gold/10 transition-colors"
          >
            {showForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Set Birth Data
          </button>
        </div>
        {showForm && (
          <div className="mt-3 pt-3 border-t border-pip-border">
            <BirthDataForm onSubmit={handleSaveBirthData} compact />
          </div>
        )}
      </div>
    );
  }

  const panchangaData = panchanga?.result as Record<string, unknown> | undefined;
  const vedicClockData = vedicClock?.result as Record<string, unknown> | undefined;
  const biorhythmData = biorhythm?.result as Record<string, unknown> | undefined;
  const numerologyData = numerology?.result as Record<string, unknown> | undefined;

  // Extract display values
  const panchangaPrimary = extractPrimary(panchangaData, 'tithi', 'Tithi', 'lunar_day');
  const panchangaSecondary = extractPrimary(panchangaData, 'nakshatra', 'Nakshatra', 'lunar_mansion');

  const vedicClockPrimary = extractPrimary(vedicClockData, 'hora', 'current_hora', 'Hora');
  const vedicClockSecondary = extractPrimary(vedicClockData, 'ghati', 'current_ghati', 'Ghati');

  const physical = biorhythmData?.physical ?? biorhythmData?.physical_cycle ?? '—';
  const emotional = biorhythmData?.emotional ?? biorhythmData?.emotional_cycle ?? '—';
  const intellectual = biorhythmData?.intellectual ?? biorhythmData?.intellectual_cycle ?? '—';
  const biorhythmPrimary = `${physical}/${emotional}/${intellectual}`;

  const numerologyPrimary = extractPrimary(numerologyData, 'personal_day', 'personalDay', 'personal_day_number');
  const numerologySecondary = extractPrimary(numerologyData, 'life_path', 'lifePath', 'life_path_number');

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs uppercase tracking-wider text-pip-text-muted font-medium">
          Today — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="text-[10px] text-pip-text-muted hover:text-pip-gold transition-colors"
        >
          Edit Birth Data
        </button>
      </div>

      {/* Inline birth data form */}
      {showForm && (
        <div className="mystic-panel !p-4">
          <BirthDataForm initialData={state.birthData} onSubmit={handleSaveBirthData} compact />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="mystic-panel !p-3 border-pip-danger/30">
          <p className="text-xs text-pip-danger">Unable to fetch timing data: {error.message}</p>
        </div>
      )}

      {/* Timing Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-1.5 sm:gap-2">
        <TimingCard
          title="Panchanga"
          primaryValue={panchangaPrimary}
          secondaryValue={panchangaSecondary !== '—' ? panchangaSecondary : undefined}
          icon={<Sun className="w-4 h-4" />}
          isLoading={isLoading && !panchanga}
        />
        <TimingCard
          title="Vedic Clock"
          primaryValue={vedicClockPrimary}
          secondaryValue={vedicClockSecondary !== '—' ? `Ghati ${vedicClockSecondary}` : undefined}
          icon={<Clock className="w-4 h-4" />}
          isLive
          isLoading={isLoading && !vedicClock}
        />
        <TimingCard
          title="Biorhythm"
          primaryValue={biorhythmPrimary}
          secondaryValue="P / E / I"
          icon={<Activity className="w-4 h-4" />}
          isLoading={isLoading && !biorhythm}
        />
        <TimingCard
          title="Numerology"
          primaryValue={numerologyPrimary}
          secondaryValue={numerologySecondary !== '—' ? `Life Path ${numerologySecondary}` : undefined}
          icon={<Hash className="w-4 h-4" />}
          isLoading={isLoading && !numerology}
        />
      </div>
    </div>
  );
}
