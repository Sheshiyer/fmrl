import React from 'react';
import { BookOpenText, Search } from 'lucide-react';

export const DocsPage: React.FC = () => {
  return (
    <div className="h-full min-h-0 grid grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden">
      <div className="mystic-page-header">
        <h1 className="mystic-section-title text-lg sm:text-xl">Docs</h1>
        <button className="mystic-btn mystic-btn-secondary !px-3 !py-2 flex items-center gap-2">
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,0.45fr)_minmax(0,1fr)] gap-3 min-h-0">
        <section className="mystic-panel !p-4">
          <span className="mystic-eyebrow">Sections</span>
          <ul className="mt-3 space-y-2 text-sm text-pip-text-secondary">
            <li>Getting Started</li>
            <li>Dashboard Guide</li>
            <li>Metrics Glossary</li>
            <li>Desktop Runtime</li>
          </ul>
        </section>
        <section className="mystic-panel !p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2"><BookOpenText className="w-4 h-4 text-pip-gold" /><span className="mystic-eyebrow">Knowledge Base</span></div>
          <p className="text-sm text-pip-text-secondary">Searchable in-app documentation and contextual guides for operators and developers.</p>
        </section>
      </div>
    </div>
  );
};
