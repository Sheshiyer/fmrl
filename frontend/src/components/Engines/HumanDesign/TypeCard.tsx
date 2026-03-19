import { Sparkles } from 'lucide-react';

interface TypeCardProps {
  type?: string;       // e.g. "Generator", "Projector", "Manifestor", "Reflector", "Manifesting Generator"
  strategy?: string;   // e.g. "To Respond", "Wait for the Invitation"
  authority?: string;  // e.g. "Sacral", "Emotional", "Splenic"
  profile?: string;    // e.g. "3/5", "6/2"
}

export function TypeCard({ type, strategy, authority, profile }: TypeCardProps) {
  // Type determines accent color
  const typeColor: Record<string, string> = {
    'Generator': 'pip-emerald',
    'Manifesting Generator': 'pip-emerald',
    'Projector': 'pip-gold',
    'Manifestor': 'pip-danger',
    'Reflector': 'pip-accent',
  };
  const accent = typeColor[type ?? ''] ?? 'pip-gold';

  return (
    <div className="mystic-panel !p-5 flex flex-col gap-4">
      {/* Type — largest, most prominent */}
      <div className="flex items-center gap-3">
        <Sparkles className={`w-5 h-5 text-${accent}`} />
        <span className={`text-2xl font-bold text-${accent} tracking-wide`}>{type ?? '—'}</span>
      </div>
      {/* Strategy + Authority + Profile row */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium block mb-1">Strategy</span>
          <span className="text-sm font-medium text-pip-text-primary">{strategy ?? '—'}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium block mb-1">Authority</span>
          <span className="text-sm font-medium text-pip-text-primary">{authority ?? '—'}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium block mb-1">Profile</span>
          <span className="text-sm font-medium text-pip-text-primary">{profile ?? '—'}</span>
        </div>
      </div>
    </div>
  );
}
