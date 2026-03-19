/**
 * EngineDirectoryPage
 * Displays a grid of available Selemene engines with status and navigation
 */
import { useNavigate } from 'react-router-dom';
import { Compass, AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { useSelemene } from '../hooks/useSelemene';
import type { EngineInfo } from '../types/selemene';

function SkeletonCard() {
  return (
    <div className="mystic-panel !p-5 flex flex-col gap-3 animate-pulse">
      <div className="h-5 w-2/3 rounded bg-white/5" />
      <div className="h-3 w-1/3 rounded bg-white/5" />
      <div className="h-4 w-full rounded bg-white/5 mt-2" />
      <div className="h-4 w-3/4 rounded bg-white/5" />
    </div>
  );
}

function EngineCard({ engine, onClick }: { engine: EngineInfo; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mystic-panel !p-5 flex flex-col gap-3 text-left transition-all duration-200 hover:border-pip-gold/30 hover:bg-white/[0.02] cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-pip-text-primary leading-tight">
          {engine.engine_name}
        </h3>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] border border-pip-border/50 bg-black/20 text-pip-text-muted">
          Phase {engine.required_phase}
        </span>
      </div>
      <div className="text-xs text-pip-text-muted font-mono">{engine.engine_id}</div>
      {engine.description && (
        <p className="text-sm text-pip-text-secondary leading-relaxed mt-1">
          {engine.description}
        </p>
      )}
    </button>
  );
}

export function EngineDirectoryPage() {
  const navigate = useNavigate();
  const { engines, isConnected, isLoading, error } = useSelemene();

  // Not connected state
  if (!isConnected && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="mystic-panel !p-8 max-w-md text-center flex flex-col items-center gap-4">
          <WifiOff className="w-10 h-10 text-pip-warning" />
          <h2 className="mystic-section-title text-lg">Not Connected</h2>
          <p className="text-sm text-pip-text-secondary">
            Connect to Selemene API to browse available engines.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full min-h-0 flex flex-col gap-4 overflow-auto p-1">
        <div className="flex items-center gap-3">
          <Compass className="w-5 h-5 text-pip-gold" />
          <h1 className="mystic-section-title text-lg">Engines</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="mystic-panel !p-8 max-w-md text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-10 h-10 text-pip-warning" />
          <h2 className="mystic-section-title text-lg">Failed to Load Engines</h2>
          <p className="text-sm text-pip-text-secondary">{String(error)}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mystic-btn mystic-btn-ghost flex items-center gap-2 !px-4 !py-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const engineList: EngineInfo[] = engines ?? [];

  // Empty state
  if (engineList.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="mystic-panel !p-8 max-w-md text-center flex flex-col items-center gap-4">
          <Compass className="w-10 h-10 text-pip-text-muted" />
          <h2 className="mystic-section-title text-lg">No Engines Available</h2>
          <p className="text-sm text-pip-text-secondary">
            No calculation engines are currently registered with the Selemene backend.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 overflow-auto p-1">
      <div className="flex items-center gap-3">
        <Compass className="w-5 h-5 text-pip-gold" />
        <h1 className="mystic-section-title text-lg">Engines</h1>
        <span className="text-xs text-pip-text-muted">
          {engineList.length} available
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {engineList.map((engine) => (
          <EngineCard
            key={engine.engine_id}
            engine={engine}
            onClick={() => navigate(`/engines/${engine.engine_id}`)}
          />
        ))}
      </div>
    </div>
  );
}
