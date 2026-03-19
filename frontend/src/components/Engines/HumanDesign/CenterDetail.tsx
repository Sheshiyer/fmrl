import { X } from 'lucide-react';

interface CenterDetailProps {
  centerId: string;
  centerName: string;
  defined: boolean;
  gates?: number[];
  onClose: () => void;
  onGateClick?: (gate: number) => void;
}

export function CenterDetail({ centerId, centerName, defined, gates, onClose, onGateClick }: CenterDetailProps) {
  // Center descriptions
  const descriptions: Record<string, string> = {
    head: 'Inspiration and mental pressure. Questions that drive inquiry.',
    ajna: 'Conceptualization and mental processing. How you think.',
    throat: 'Communication and manifestation. How you express and act.',
    g: 'Identity, love, and direction. Your sense of self.',
    sacral: 'Life force energy, sexuality, and workforce capacity.',
    root: 'Adrenaline pressure and drive. Stress and momentum.',
    heart: 'Willpower, ego, and material world. Value and worth.',
    spleen: 'Intuition, health, and survival instincts. Moment-to-moment awareness.',
    solar_plexus: 'Emotional wave and feeling. Depth of emotional experience.',
  };

  return (
    <div className="mystic-panel !p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-pip-text-primary">{centerName} Center</h3>
          <span className={`text-xs ${defined ? 'text-pip-gold' : 'text-pip-text-muted'}`}>
            {defined ? 'Defined — Consistent energy' : 'Undefined — Open to conditioning'}
          </span>
        </div>
        <button type="button" onClick={onClose} className="text-pip-text-muted hover:text-pip-text-primary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-pip-text-secondary leading-relaxed">
        {descriptions[centerId] ?? 'Center of the Human Design Body Graph.'}
      </p>
      {gates && gates.length > 0 && (
        <div>
          <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium block mb-2">Gates</span>
          <div className="flex flex-wrap gap-1.5">
            {gates.map(gate => (
              <button key={gate} type="button" onClick={() => onGateClick?.(gate)}
                className="px-2 py-1 rounded text-xs border border-pip-border hover:border-pip-gold/50 text-pip-text-secondary hover:text-pip-gold transition-colors">
                Gate {gate}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
