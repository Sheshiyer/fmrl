/**
 * NumerologyResult Component
 * Dedicated renderer for the Numerology engine showing core numbers and personal timing.
 * Displays Life Path, Destiny, Soul Urge, Personality numbers in a 2x2 grid,
 * personal timing (year/month/day), and optional name analysis.
 */
import { Hash, Calendar, Sparkles, Clock, Cpu, Database } from 'lucide-react';
import type { EngineOutput } from '../../types/selemene';

function NumberBadge({ value, label, primary = false }: { value: unknown; label: string; primary?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${primary ? 'bg-pip-gold/15 border-pip-gold/40' : 'bg-pip-dark border-pip-border'}`}>
      <span className={`text-3xl font-bold ${primary ? 'text-pip-gold' : 'text-pip-text-primary'}`}>
        {String(value ?? '—')}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium">{label}</span>
    </div>
  );
}

function TimingBadge({ value, label }: { value: unknown; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border border-pip-border/50 bg-pip-dark/60">
      <span className="text-xl font-bold text-pip-text-primary">
        {String(value ?? '—')}
      </span>
      <span className="text-[9px] uppercase tracking-wider text-pip-text-muted font-medium">{label}</span>
    </div>
  );
}

export function NumerologyResult({ result }: { result: EngineOutput }) {
  if (!result) {
    return (
      <div className="mystic-panel !p-6 text-center text-pip-text-muted">
        No numerology data available.
      </div>
    );
  }

  const data = result.result as Record<string, unknown>;
  const lifePath = data.life_path ?? data.lifePath ?? data.life_path_number ?? '—';
  const destiny = data.destiny ?? data.destiny_number ?? data.expression ?? '—';
  const soulUrge = data.soul_urge ?? data.soulUrge ?? data.heart_desire ?? '—';
  const personality = data.personality ?? data.personality_number ?? data.outer ?? '—';
  const personalYear = data.personal_year ?? data.personalYear ?? null;
  const personalMonth = data.personal_month ?? data.personalMonth ?? null;
  const personalDay = data.personal_day ?? data.personalDay ?? null;
  const nameAnalysis = data.name_analysis ?? data.nameAnalysis ?? null;

  const hasPersonalTiming = personalYear !== null || personalMonth !== null || personalDay !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* Witness Prompt */}
      {result.witness_prompt && (
        <div className="mystic-panel !p-5">
          <p className="text-lg italic text-pip-gold leading-relaxed">
            &ldquo;{result.witness_prompt}&rdquo;
          </p>
        </div>
      )}

      {/* Engine Badge */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs border border-pip-border/50 bg-black/20 text-pip-text-secondary flex items-center gap-1.5">
          <Hash className="w-3 h-3" />
          {result.engine_id}
        </span>
        <span className="px-3 py-1 rounded-full text-xs border border-pip-gold/30 bg-pip-gold/10 text-pip-gold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Level {result.consciousness_level}
        </span>
      </div>

      {/* Core Numbers Grid */}
      <div className="mystic-panel !p-4">
        <div className="mystic-eyebrow text-xs mb-3 flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5 text-pip-text-muted" />
          Core Numbers
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberBadge value={lifePath} label="Life Path" primary />
          <NumberBadge value={destiny} label="Destiny" />
          <NumberBadge value={soulUrge} label="Soul Urge" />
          <NumberBadge value={personality} label="Personality" />
        </div>
      </div>

      {/* Personal Timing Row */}
      {hasPersonalTiming && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-pip-text-muted" />
            Personal Timing
          </div>
          <div className="flex flex-row gap-3 justify-center">
            {personalYear !== null && (
              <TimingBadge value={personalYear} label="Personal Year" />
            )}
            {personalMonth !== null && (
              <TimingBadge value={personalMonth} label="Personal Month" />
            )}
            {personalDay !== null && (
              <TimingBadge value={personalDay} label="Personal Day" />
            )}
          </div>
        </div>
      )}

      {/* Name Analysis Section */}
      {nameAnalysis !== null && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-3">Name Analysis</div>
          {typeof nameAnalysis === 'object' && nameAnalysis !== null ? (
            <div className="flex flex-col gap-2">
              {Object.entries(nameAnalysis as Record<string, unknown>).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm border-b border-pip-border/20 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-pip-text-muted capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-pip-text-primary font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-pip-text-secondary">{String(nameAnalysis)}</p>
          )}
        </div>
      )}

      {/* Metadata Footer */}
      {result.metadata && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-3">Metadata</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2 text-pip-text-secondary">
              <Clock className="w-3.5 h-3.5 text-pip-text-muted" />
              <span>{result.metadata.calculation_time_ms}ms</span>
            </div>
            <div className="flex items-center gap-2 text-pip-text-secondary">
              <Cpu className="w-3.5 h-3.5 text-pip-text-muted" />
              <span>{result.metadata.backend}</span>
            </div>
            <div className="flex items-center gap-2 text-pip-text-secondary">
              <Database className="w-3.5 h-3.5 text-pip-text-muted" />
              <span>{result.metadata.cached ? 'Cached' : 'Fresh'}</span>
            </div>
            <div className="text-pip-text-muted text-xs">
              {new Date(result.metadata.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
