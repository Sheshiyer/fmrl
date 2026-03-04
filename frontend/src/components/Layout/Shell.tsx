import React, { type ReactNode } from 'react';
import { Header } from './Header';
import { TimelineStrip, type TimelineDataPoint } from './TimelineStrip';

interface ShellProps {
  children: ReactNode;
  timelineData?: TimelineDataPoint[];
  sessionDuration?: number;
  isConnected?: boolean;
  onShowMetricsGuide?: () => void;
}

export const Shell: React.FC<ShellProps> = ({
  children,
  timelineData = [],
  sessionDuration = 0,
  isConnected = false,
  onShowMetricsGuide,
}) => {
  const panels = React.Children.toArray(children);
  const stagePanel = panels[0] ?? null;
  const metricsPanel = panels[1] ?? null;

  return (
    <div className="mystic-bg mystic-shell min-h-screen flex flex-col bg-pip-bg text-pip-text-primary font-sans selection:bg-pip-accent selection:text-white overflow-hidden">
      <Header isConnected={isConnected} onShowMetricsGuide={onShowMetricsGuide} />

      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(178,135,255,0.16),transparent_42%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_80%,rgba(46,199,167,0.11),transparent_36%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_50%,rgba(216,179,106,0.1),transparent_54%)]" />
        </div>

        <div className="mystic-dashboard-grid w-full h-full max-w-[1880px] mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1.68fr)_minmax(320px,0.92fr)] lg:grid-rows-[minmax(0,1fr)_auto] gap-3 sm:gap-4 overflow-y-auto">
          <section className="mystic-stage-zone lg:row-start-1 lg:col-start-1 min-h-[360px] lg:min-h-0">
            {stagePanel}
          </section>

          <aside className="mystic-rail-zone lg:row-start-1 lg:col-start-2 min-h-[320px] lg:min-h-0">
            {metricsPanel}
          </aside>

          <section className="mystic-analytics-zone lg:row-start-2 lg:col-span-2">
            <TimelineStrip data={timelineData} sessionDuration={sessionDuration} />
          </section>
        </div>
      </main>
    </div>
  );
};
