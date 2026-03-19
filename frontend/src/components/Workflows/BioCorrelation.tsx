import { Activity, Zap, Scale, Brain, Gauge, Palette } from 'lucide-react';

interface BioCorrelationProps {
  snapshot: {
    energy: number;
    symmetry: number;
    coherence: number;
    complexity: number;
    regulation: number;
    colorBalance: number;
    capturedAt: string;
  } | null;
}

function scoreTone(score: number): string {
  if (score >= 75) return 'text-pip-emerald';
  if (score <= 55) return 'text-pip-danger';
  return 'text-pip-warning';
}

const METRICS = [
  { key: 'energy', label: 'Energy', icon: Zap },
  { key: 'symmetry', label: 'Symmetry', icon: Scale },
  { key: 'coherence', label: 'Coherence', icon: Brain },
  { key: 'complexity', label: 'Complexity', icon: Activity },
  { key: 'regulation', label: 'Regulation', icon: Gauge },
  { key: 'colorBalance', label: 'Color', icon: Palette },
] as const;

export function BioCorrelation({ snapshot }: BioCorrelationProps) {
  if (!snapshot) return null;

  const avg = Math.round(
    (snapshot.energy + snapshot.symmetry + snapshot.coherence +
     snapshot.complexity + snapshot.regulation + snapshot.colorBalance) / 6
  );

  return (
    <div className="mystic-panel !p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-pip-accent" />
          <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium">
            Biofield at time of reading
          </span>
        </div>
        <span className={`text-sm font-bold ${scoreTone(avg)}`}>{avg}%</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {METRICS.map(({ key, label, icon: Icon }) => {
          const value = snapshot[key as keyof typeof snapshot] as number;
          return (
            <div key={key} className="flex flex-col items-center gap-1">
              <Icon className={`w-3.5 h-3.5 ${scoreTone(value)}`} />
              <span className={`text-sm font-bold ${scoreTone(value)}`}>{Math.round(value)}%</span>
              <span className="text-[9px] text-pip-text-muted uppercase">{label}</span>
            </div>
          );
        })}
      </div>
      <span className="text-[9px] text-pip-text-muted">
        Captured {new Date(snapshot.capturedAt).toLocaleTimeString()}
      </span>
    </div>
  );
}
