import { ChevronRight } from 'lucide-react';

interface SequencePosition {
  label: string;
  keyNumber: number;
  line?: number;
}

interface SequenceViewProps {
  positions: SequencePosition[];
  onKeyClick?: (keyNumber: number) => void;
}

export function SequenceView({ positions, onKeyClick }: SequenceViewProps) {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap py-4">
      {positions.map((pos, i) => (
        <div key={pos.label} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onKeyClick?.(pos.keyNumber)}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-14 h-14 rounded-full border-2 border-pip-gold/50 bg-pip-gold/10 flex items-center justify-center group-hover:bg-pip-gold/20 group-hover:border-pip-gold transition-colors">
              <span className="text-xl font-bold text-pip-gold">
                {pos.keyNumber}
              </span>
            </div>
            {pos.line !== undefined && (
              <span className="text-[9px] text-pip-text-muted">
                Line {pos.line}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium text-center max-w-[80px]">
              {pos.label}
            </span>
          </button>
          {i < positions.length - 1 && (
            <ChevronRight className="w-4 h-4 text-pip-border flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}
