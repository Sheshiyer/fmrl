/**
 * MetricsTooltip - Button to navigate to the metrics guide page
 */
import React from 'react';
import { HelpCircle } from 'lucide-react';

interface MetricsTooltipProps {
  className?: string;
  onShowMetricsGuide?: () => void;
}

export const MetricsTooltip: React.FC<MetricsTooltipProps> = ({ className = '', onShowMetricsGuide }) => {
  return (
    <button
      onClick={onShowMetricsGuide}
      className={`mystic-btn mystic-btn-ghost !px-2.5 !py-2 flex items-center gap-1.5 ${className}`}
      title="View metrics definitions"
    >
      <HelpCircle className="w-4 h-4" />
      <span className="text-xs font-medium hidden md:inline tracking-[0.12em] uppercase">Metrics Guide</span>
    </button>
  );
};
