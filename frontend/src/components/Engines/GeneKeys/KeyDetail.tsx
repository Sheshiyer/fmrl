import { X, ArrowRight } from 'lucide-react';

interface KeyDetailProps {
  keyNumber: number;
  shadow?: string;
  gift?: string;
  siddhi?: string;
  description?: string;
  onClose: () => void;
  onViewHDGate?: (gateNumber: number) => void;
}

export function KeyDetail({ keyNumber, shadow, gift, siddhi, description, onClose, onViewHDGate }: KeyDetailProps) {
  return (
    <div className="mystic-panel !p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pip-gold/15 border border-pip-gold/40 flex items-center justify-center">
            <span className="text-lg font-bold text-pip-gold">{keyNumber}</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-pip-text-primary">Gene Key {keyNumber}</h3>
            {onViewHDGate && (
              <button type="button" onClick={() => onViewHDGate(keyNumber)}
                className="text-[10px] text-pip-gold hover:underline">
                HD Gate {keyNumber} →
              </button>
            )}
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-pip-text-muted hover:text-pip-text-primary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Shadow → Gift → Siddhi Progression */}
      <div className="flex items-stretch gap-2">
        {/* Shadow */}
        <div className="flex-1 rounded-lg border border-pip-danger/30 bg-pip-danger/5 p-3 flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-pip-danger/70 font-medium">Shadow</span>
          <span className="text-sm font-medium text-pip-text-primary text-center">{shadow ?? '—'}</span>
        </div>
        <div className="flex items-center"><ArrowRight className="w-3 h-3 text-pip-text-muted" /></div>
        {/* Gift */}
        <div className="flex-1 rounded-lg border border-pip-emerald/30 bg-pip-emerald/5 p-3 flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-pip-emerald/70 font-medium">Gift</span>
          <span className="text-sm font-medium text-pip-text-primary text-center">{gift ?? '—'}</span>
        </div>
        <div className="flex items-center"><ArrowRight className="w-3 h-3 text-pip-text-muted" /></div>
        {/* Siddhi */}
        <div className="flex-1 rounded-lg border border-pip-gold/30 bg-pip-gold/5 p-3 flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-pip-gold/70 font-medium">Siddhi</span>
          <span className="text-sm font-medium text-pip-text-primary text-center">{siddhi ?? '—'}</span>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-pip-text-secondary leading-relaxed">{description}</p>
      )}
    </div>
  );
}
