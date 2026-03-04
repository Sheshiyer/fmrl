import React from 'react';
import { Activity, History, Download, Settings, User, Menu } from 'lucide-react';
import { MetricsTooltip } from '../UI/MetricsTooltip';

interface HeaderProps {
  isConnected?: boolean;
  onShowMetricsGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isConnected = false, onShowMetricsGuide }) => {
  return (
    <header className="mystic-header h-16 sm:h-[4.5rem] px-3 sm:px-6 flex items-center justify-between border-b border-pip-border/70 bg-[rgba(4,8,16,0.82)] backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <div className="flex items-center gap-2 text-pip-accent shrink-0">
          <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          <h1 className="text-base sm:text-xl font-semibold mystic-title leading-none uppercase tracking-[0.08em]">Biofield Mirror</h1>
        </div>
        <span className="text-pip-text-muted text-xs sm:text-sm hidden lg:inline-block border-l border-pip-border/60 pl-4 truncate tracking-[0.03em]">
          Polycontrast interference imaging analysis
        </span>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex">
        <div className={`mystic-badge ${isConnected ? 'is-success' : 'is-warning'} flex items-center gap-2.5 !px-4 !py-1.5`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isConnected ? 'bg-emerald-300' : 'bg-amber-300'}`} />
          {isConnected ? 'Consciousness Live' : 'Offline Preview'}
        </div>
      </div>

      <div className="flex md:hidden">
        <div className={`mystic-badge ${isConnected ? 'is-success' : 'is-warning'} !px-2.5 !py-1 text-[10px]`}>
          {isConnected ? 'LIVE' : 'LOCAL'}
        </div>
      </div>

      <div className="mystic-control-cluster flex items-center gap-1.5 sm:gap-2 shrink-0">
        <MetricsTooltip onShowMetricsGuide={onShowMetricsGuide} className="hidden sm:flex" />
        <button className="mystic-btn mystic-btn-ghost !px-2.5 !py-2 hidden sm:flex" title="History">
          <History className="w-4 h-4 text-pip-text-secondary" />
        </button>
        <button className="mystic-btn mystic-btn-ghost !px-2.5 !py-2 hidden sm:flex" title="Export">
          <Download className="w-4 h-4 text-pip-text-secondary" />
        </button>
        <button className="mystic-btn mystic-btn-ghost !px-2.5 !py-2" title="Settings">
          <Settings className="w-4 h-4 text-pip-text-secondary" />
        </button>
        <div className="w-px h-6 bg-pip-border/60 mx-0.5 hidden sm:block" />
        <button className="mystic-btn mystic-btn-ghost !px-2.5 !py-2 rounded-full hidden sm:flex" title="Profile">
          <User className="w-4 h-4 text-pip-text-secondary" />
        </button>
        <button className="mystic-btn mystic-btn-ghost !px-2 !py-2 sm:hidden" title="Menu">
          <Menu className="w-4 h-4 text-pip-text-secondary" />
        </button>
      </div>
    </header>
  );
};
