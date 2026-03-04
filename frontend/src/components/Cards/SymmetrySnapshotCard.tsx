import React from 'react';
import { GlassCard } from './GlassCard';
import { Scaling } from 'lucide-react';

export interface SymmetrySnapshotData {
  innerSymmetry: number;
  outerSymmetry: number;
}

interface SymmetrySnapshotCardProps {
  data?: SymmetrySnapshotData;
}

const getSymmetryColor = (value: number): string => {
  if (value >= 80) return 'bg-pip-success/80';
  if (value >= 60) return 'bg-yellow-500/80';
  return 'bg-orange-500/80';
};

const calculateBarWidths = (symmetry: number): { left: number; gap: number; right: number } => {
  const gapPercent = Math.max(4, (100 - symmetry) * 0.3);
  const remainingWidth = 100 - gapPercent;
  const asymmetryFactor = (100 - symmetry) / 200;
  const leftWidth = (remainingWidth / 2) * (1 - asymmetryFactor);
  const rightWidth = (remainingWidth / 2) * (1 + asymmetryFactor);

  return { left: leftWidth, gap: gapPercent, right: rightWidth };
};

export const SymmetrySnapshotCard: React.FC<SymmetrySnapshotCardProps> = ({
  data = { innerSymmetry: 50, outerSymmetry: 50 },
}) => {
  const innerWidths = calculateBarWidths(data.innerSymmetry);
  const outerWidths = calculateBarWidths(data.outerSymmetry);
  const innerColor = getSymmetryColor(data.innerSymmetry);
  const outerColor = getSymmetryColor(data.outerSymmetry);

  return (
    <GlassCard className="flex flex-col gap-3 !p-4 sm:!p-[1.125rem]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Scaling className="w-4 h-4 text-pip-accent" />
          <h3 className="text-sm font-semibold mystic-section-title">Symmetry Snapshot</h3>
        </div>
        <span className="mystic-badge !text-[10px] !px-2 !py-0.5">Bilateral</span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-pip-text-secondary mb-1.5 tracking-[0.08em]">
            <span>Inner (Body)</span>
            <span className="text-pip-text-primary mystic-data-value">{data.innerSymmetry}%</span>
          </div>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden flex">
            <div className={`h-full ${innerColor} rounded-l-full transition-all duration-500`} style={{ width: `${innerWidths.left}%` }} />
            <div className="h-full bg-transparent relative transition-all duration-500" style={{ width: `${innerWidths.gap}%` }}>
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30 -translate-x-1/2" />
            </div>
            <div className={`h-full ${innerColor} rounded-r-full transition-all duration-500`} style={{ width: `${innerWidths.right}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-pip-text-secondary mb-1.5 tracking-[0.08em]">
            <span>Outer (Field)</span>
            <span className="text-pip-text-primary mystic-data-value">{data.outerSymmetry}%</span>
          </div>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden flex">
            <div className={`h-full ${outerColor} rounded-l-full transition-all duration-500`} style={{ width: `${outerWidths.left}%` }} />
            <div className="h-full bg-transparent relative transition-all duration-500" style={{ width: `${outerWidths.gap}%` }}>
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30 -translate-x-1/2" />
            </div>
            <div className={`h-full ${outerColor} rounded-r-full transition-all duration-500`} style={{ width: `${outerWidths.right}%` }} />
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
