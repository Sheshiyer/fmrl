import { useState, useMemo } from 'react';
import { SequenceView } from './SequenceView';

interface HologeneticProfileProps {
  sequences?: Record<
    string,
    Record<string, number | { key: number; line?: number }>
  >;
  activeSequence?: string;
  onSequenceChange?: (seq: string) => void;
  onKeyClick?: (keyNumber: number) => void;
}

const SEQUENCE_TABS = [
  'Activation',
  'Venus',
  'Pearl',
  'Purpose',
] as const;

type SequenceName = (typeof SEQUENCE_TABS)[number];

const DEFAULT_POSITIONS: Record<
  SequenceName,
  { label: string; defaultKey: number }[]
> = {
  Activation: [
    { label: "Life's Work", defaultKey: 1 },
    { label: 'Evolution', defaultKey: 2 },
    { label: 'Radiance', defaultKey: 3 },
    { label: 'Purpose', defaultKey: 4 },
  ],
  Venus: [
    { label: 'SQ', defaultKey: 5 },
    { label: 'EQ', defaultKey: 6 },
    { label: 'IQ', defaultKey: 7 },
    { label: 'Pearl', defaultKey: 8 },
  ],
  Pearl: [
    { label: "Life's Work", defaultKey: 1 },
    { label: 'Evolution', defaultKey: 2 },
    { label: 'Culture', defaultKey: 9 },
    { label: 'Brand', defaultKey: 10 },
    { label: 'Pearl', defaultKey: 11 },
    { label: 'Vocation', defaultKey: 12 },
  ],
  Purpose: [
    { label: 'Core Stability', defaultKey: 13 },
    { label: 'Core Talent', defaultKey: 14 },
    { label: 'Core Wound', defaultKey: 15 },
    { label: 'Vocation', defaultKey: 16 },
  ],
};

function resolveKeyNumber(
  value: number | { key: number; line?: number } | undefined,
  fallback: number,
): { keyNumber: number; line?: number } {
  if (value === undefined) return { keyNumber: fallback };
  if (typeof value === 'number') return { keyNumber: value };
  return { keyNumber: value.key, line: value.line };
}

export function HologeneticProfile({
  sequences,
  activeSequence,
  onSequenceChange,
  onKeyClick,
}: HologeneticProfileProps) {
  const [internalTab, setInternalTab] = useState<string>('Activation');
  const currentTab = activeSequence ?? internalTab;

  const handleTabChange = (tab: string) => {
    if (onSequenceChange) {
      onSequenceChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const positions = useMemo(() => {
    const seqName = currentTab as SequenceName;
    const defs = DEFAULT_POSITIONS[seqName] ?? DEFAULT_POSITIONS.Activation;
    const seqData = sequences?.[currentTab];

    return defs.map((def) => {
      const raw = seqData?.[def.label];
      const resolved = resolveKeyNumber(raw, def.defaultKey);
      return {
        label: def.label,
        keyNumber: resolved.keyNumber,
        line: resolved.line,
      };
    });
  }, [currentTab, sequences]);

  return (
    <div className="flex flex-col gap-4">
      {/* Sequence Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {SEQUENCE_TABS.map((tab) => {
          const isActive = currentTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-pip-gold/20 text-pip-gold border border-pip-gold/50'
                  : 'bg-pip-surface/50 text-pip-text-muted border border-pip-border/30 hover:border-pip-border hover:text-pip-text',
              ].join(' ')}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Sequence Title */}
      <h3 className="text-sm font-semibold text-pip-text uppercase tracking-wider text-center">
        {currentTab} Sequence
      </h3>

      {/* Sequence Flow Diagram */}
      <SequenceView positions={positions} onKeyClick={onKeyClick} />
    </div>
  );
}
