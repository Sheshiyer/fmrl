import React from 'react';
import { Activity, History, Download, Bell, Sparkles } from 'lucide-react';
import { MetricsTooltip } from '../UI/MetricsTooltip';

interface HeaderProps {
  isConnected?: boolean;
  onShowMetricsGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isConnected = false, onShowMetricsGuide }) => {
  return (
    <header className="mystic-header mystic-panel !p-2.5 sm:!p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="mystic-badge !px-3 !py-1 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[10px]">Consciousness Workspace</span>
        </div>
        <span className="text-xs text-pip-text-muted truncate hidden lg:block">Polycontrast interference imaging analysis</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className={`mystic-badge ${isConnected ? 'is-success' : 'is-warning'} !px-3.5 !py-1.5 flex items-center gap-2`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isConnected ? 'bg-emerald-300' : 'bg-amber-300'}`} />
          {isConnected ? 'Live' : 'Preview'}
        </div>

        <MetricsTooltip onShowMetricsGuide={onShowMetricsGuide} className="hidden sm:flex" />

        <button className="mystic-btn mystic-btn-ghost !px-2.5 !py-2" title="History">
          <History className="w-4 h-4 text-pip-text-secondary" />
        </button>
        <button className="mystic-btn mystic-btn-ghost !px-2.5 !py-2" title="Export">
          <Download className="w-4 h-4 text-pip-text-secondary" />
        </button>
        <button className="mystic-btn mystic-btn-ghost !px-2.5 !py-2" title="Alerts">
          <Bell className="w-4 h-4 text-pip-text-secondary" />
        </button>
        <button className="mystic-btn mystic-btn-ghost !px-2.5 !py-2" title="Runtime">
          <Activity className="w-4 h-4 text-pip-text-secondary" />
        </button>
      </div>
    </header>
  );
};
