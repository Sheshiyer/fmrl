import React from 'react';
import { Info } from 'lucide-react';

export const InfoPage: React.FC = () => {
  return (
    <div className="h-full min-h-0 grid grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden">
      <div className="mystic-page-header">
        <h1 className="mystic-section-title text-lg sm:text-xl">Info</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-0">
        <section className="mystic-panel !p-4">
          <span className="mystic-eyebrow">App</span>
          <p className="mt-2 text-sm text-pip-text-secondary">FMRL — Frequency Modulated Reality Lens</p>
          <p className="text-sm text-pip-text-secondary">Version 0.1.0</p>
        </section>
        <section className="mystic-panel !p-4">
          <span className="mystic-eyebrow">Runtime</span>
          <p className="mt-2 text-sm text-pip-text-secondary">Tauri + React + Python sidecar</p>
          <p className="text-sm text-pip-text-secondary">Hybrid metrics architecture</p>
        </section>
        <section className="mystic-panel !p-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-pip-gold mt-0.5" />
          <p className="text-sm text-pip-text-secondary">Release notes, legal information, and diagnostics summary are surfaced here.</p>
        </section>
      </div>
    </div>
  );
};
