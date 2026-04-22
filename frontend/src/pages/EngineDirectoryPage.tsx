/**
 * EngineDirectoryPage
 * Displays a grid of available Selemene engines with status and navigation
 */
import { useNavigate } from 'react-router-dom';
import { Compass, AlertCircle, RefreshCw, WifiOff, ShieldAlert, Loader2 } from 'lucide-react';
import { useSelemene } from '../hooks/useSelemene';
import { useAuth } from '../context/auth/AuthContext';
import { SacredGeometryOverlay } from '../components/UI/SacredGeometryOverlay';
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
  const { engines, canAccessApi, isLoading, error } = useSelemene();
  const { status: authStatus, selemeneStatus } = useAuth();
  const isBrowserTransportBlocked = error?.message.includes('blocked by CORS') ?? false;

  if (!canAccessApi && authStatus === 'authenticated' && selemeneStatus === 'connecting') {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="mystic-panel !p-8 max-w-md text-center flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-pip-gold animate-spin" />
          <h2 className="mystic-section-title text-lg">Connecting to Selemene</h2>
          <p className="text-sm text-pip-text-secondary">
            Restoring your engine catalog and live reflection surfaces.
          </p>
        </div>
      </div>
    );
  }

  if (!canAccessApi && !isLoading) {
    const isGuest = authStatus === 'guest';
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="mystic-panel !p-8 max-w-md text-center flex flex-col items-center gap-4">
          {isGuest ? (
            <>
              <ShieldAlert className="w-10 h-10 text-pip-gold" />
              <h2 className="mystic-section-title text-lg">Sign In to Browse Engines</h2>
              <p className="text-sm text-pip-text-secondary">
                The engine directory requires a Selemene account. Sign in or create an account to browse and run all 12 engines.
              </p>
            </>
          ) : (
            <>
              <WifiOff className="w-10 h-10 text-pip-warning" />
              <h2 className="mystic-section-title text-lg">Not Connected</h2>
              <p className="text-sm text-pip-text-secondary">
                Connect to Selemene API to browse available engines.
              </p>
            </>
          )}
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
          <h2 className="mystic-section-title text-lg">
            {isBrowserTransportBlocked ? 'Browser Access Blocked' : 'Failed to Load Engines'}
          </h2>
          <p className="text-sm text-pip-text-secondary">
            {isBrowserTransportBlocked
              ? 'Live Selemene engine discovery is blocked in the browser by the current API CORS policy. Use the desktop runtime for live engine access.'
              : String(error)}
          </p>
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
    <div className="relative h-full min-h-0 flex flex-col gap-4 overflow-auto p-1">
      <SacredGeometryOverlay
        variant="flower-of-life"
        size={300}
        opacity={0.025}
        className="absolute right-0 top-10"
      />
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
