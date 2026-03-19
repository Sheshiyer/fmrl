import { X, ArrowRight } from 'lucide-react';

interface ChannelDetailProps {
  fromCenter: string;
  toCenter: string;
  gates?: [number, number];
  defined: boolean;
  onClose: () => void;
  onViewGeneKey?: (gateNumber: number) => void;
}

export function ChannelDetail({ fromCenter, toCenter, gates, defined, onClose, onViewGeneKey }: ChannelDetailProps) {
  return (
    <div className="mystic-panel !p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-pip-text-primary capitalize">{fromCenter}</span>
          <ArrowRight className="w-3 h-3 text-pip-text-muted" />
          <span className="text-sm font-medium text-pip-text-primary capitalize">{toCenter}</span>
        </div>
        <button type="button" onClick={onClose} className="text-pip-text-muted hover:text-pip-text-primary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <span className={`text-xs ${defined ? 'text-pip-gold' : 'text-pip-text-muted'}`}>
        {defined ? 'Defined Channel — Fixed energy flow' : 'Undefined — Open to amplification'}
      </span>
      {gates && (
        <div className="flex items-center gap-3">
          {gates.map(gate => (
            <div key={gate} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-pip-text-primary">{gate}</span>
              <span className="text-[10px] uppercase tracking-wider text-pip-text-muted">Gate</span>
              {onViewGeneKey && (
                <button type="button" onClick={() => onViewGeneKey(gate)}
                  className="text-[10px] text-pip-gold hover:underline">
                  Gene Key {gate} →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
