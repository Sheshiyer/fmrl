/**
 * VedicClockResult Component
 * Dedicated renderer for the Vedic Clock engine with live countdown
 * Displays Ghati, Prahara, Hora, Choghadiya with circular progress and countdown timer
 */
import { useState, useEffect } from 'react';
import { Clock, Timer } from 'lucide-react';
import type { EngineOutput } from '../../types/selemene';

// --- Planetary symbol mapping ---
const HORA_SYMBOLS: Record<string, string> = {
  sun: '\u2609',
  moon: '\u263D',
  mars: '\u2642',
  mercury: '\u263F',
  jupiter: '\u2643',
  venus: '\u2640',
  saturn: '\u2644',
};

function getHoraSymbol(hora: string): string {
  const key = String(hora).toLowerCase().trim();
  for (const [planet, symbol] of Object.entries(HORA_SYMBOLS)) {
    if (key.includes(planet)) return symbol;
  }
  return '';
}

// --- Circular Progress SVG ---
function CircularProgress({ progress, size = 80 }: { progress: number; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(215,178,109,0.15)"
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#d8b36a"
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000"
      />
    </svg>
  );
}

// --- Countdown formatting ---
function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// --- Main Component ---
export function VedicClockResult({ result }: { result: EngineOutput }) {
  const data = result.result as Record<string, unknown>;

  // Safe field accessors for varying key shapes
  const ghati = data.ghati ?? data.current_ghati ?? data.ghati_number ?? '\u2014';
  const prahara = data.prahara ?? data.current_prahara ?? data.watch_period ?? '\u2014';
  const hora = String(data.hora ?? data.current_hora ?? '\u2014');
  const choghadiya = data.choghadiya ?? data.current_choghadiya ?? data.choghadiya_period ?? '\u2014';
  const progress = Number(data.period_progress ?? data.progress ?? 0);
  const remainingSeconds = Number(data.remaining_seconds ?? data.seconds_remaining ?? data.time_remaining ?? 0);
  const periodName = String(data.period_name ?? data.current_period ?? choghadiya);

  // Live countdown timer
  const [countdown, setCountdown] = useState(Math.floor(remainingSeconds));

  useEffect(() => {
    setCountdown(Math.floor(remainingSeconds));
  }, [remainingSeconds]);

  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const horaSymbol = getHoraSymbol(hora);

  if (!result) {
    return (
      <div className="mystic-panel !p-6 text-center text-pip-text-muted">
        No Vedic Clock data available.
      </div>
    );
  }

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

      {/* Live Badge */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs border border-pip-emerald/40 bg-pip-emerald/10 text-pip-emerald flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-pip-emerald animate-pulse" />
          Live
        </span>
        <span className="px-3 py-1 rounded-full text-xs border border-pip-border/50 bg-black/20 text-pip-text-secondary">
          {result.engine_id}
        </span>
      </div>

      {/* Main Display */}
      <div className="mystic-panel !p-6">
        <div className="flex items-start justify-between gap-6">
          {/* Left: Vedic Time Details */}
          <div className="flex flex-col gap-4 flex-1">
            {/* Ghati */}
            <div>
              <div className="mystic-eyebrow text-xs mb-1">Current Ghati</div>
              <span className="text-4xl font-bold text-pip-gold">{String(ghati)}</span>
            </div>

            {/* Prahara */}
            <div>
              <div className="mystic-eyebrow text-xs mb-1">Prahara (Watch Period)</div>
              <span className="text-lg text-pip-text-primary">{String(prahara)}</span>
            </div>

            {/* Hora */}
            <div>
              <div className="mystic-eyebrow text-xs mb-1">Current Hora</div>
              <span className="text-lg text-pip-gold">
                {horaSymbol && <span className="mr-2 text-xl">{horaSymbol}</span>}
                {hora}
              </span>
            </div>

            {/* Choghadiya */}
            <div>
              <div className="mystic-eyebrow text-xs mb-1">Choghadiya Period</div>
              <span className="text-lg text-pip-text-primary">{String(choghadiya)}</span>
            </div>
          </div>

          {/* Right: Circular Progress + Countdown */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex items-center justify-center">
              <CircularProgress progress={progress} size={80} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-medium text-pip-gold">
                  {Math.round(progress * 100)}%
                </span>
              </div>
            </div>
            <div className="mystic-eyebrow text-xs text-center">{periodName}</div>
          </div>
        </div>
      </div>

      {/* Countdown Timer */}
      <div className="mystic-panel !p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-pip-gold" />
          <span className="text-sm text-pip-text-secondary">Next Transition</span>
        </div>
        <span className="text-lg font-mono text-pip-gold">
          {formatCountdown(countdown)}
        </span>
      </div>

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
              <span className="text-pip-text-muted text-xs">Backend:</span>
              <span>{result.metadata.backend}</span>
            </div>
            <div className="flex items-center gap-2 text-pip-text-secondary">
              <span className={result.metadata.cached ? 'text-pip-emerald' : 'text-pip-text-muted'}>
                {result.metadata.cached ? 'Cached' : 'Fresh'}
              </span>
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
