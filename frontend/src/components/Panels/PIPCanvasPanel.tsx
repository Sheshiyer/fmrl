import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { GlassCard } from '../Cards/GlassCard';
import { Camera, Pause, Play, Layers, User, Users, Sparkles } from 'lucide-react';
import { PIPShader, type AnalysisRegion, type PIPShaderHandle } from '../PIPCanvas/PIPShader';
import { useFrameCapture } from '../../hooks/useFrameCapture';
import type { AnalysisResult } from '../../types';

interface CaptureContext {
  userId?: string | null;
  sessionId?: string | null;
  persistenceEnabled?: boolean;
}

interface StagePreferences {
  defaultAnalysisRegion?: AnalysisRegion;
  showOverlayLegend?: boolean;
  showStageSignals?: boolean;
  enableBackendCapture?: boolean;
}

interface CapturePayload {
  imageUrl: string | null;
  analysisResult?: AnalysisResult | null;
}

interface PIPCanvasPanelProps {
  onCapture?: (payload: CapturePayload) => void;
  onMetricsUpdate?: (metrics: {
    brightness: number;
    colorEntropy: number;
    horizontalSymmetry: number;
    verticalSymmetry: number;
    saturationMean: number;
  }) => void;
  onPlaybackToggle?: (isLive: boolean) => void;
  captureContext?: CaptureContext;
  stagePreferences?: StagePreferences;
}

/** Imperative API exposed to parent via ref */
export interface PIPCanvasPanelHandle {
  triggerCapture: () => void;
  togglePlayback: () => void;
  setAnalysisRegion: (region: AnalysisRegion) => void;
}

export const PIPCanvasPanel = forwardRef<PIPCanvasPanelHandle, PIPCanvasPanelProps>(function PIPCanvasPanel({ onCapture, onMetricsUpdate, onPlaybackToggle, captureContext, stagePreferences }, ref) {
  const [isLive, setIsLive] = useState(true);
  const [fps, setFps] = useState(30);
  const [analysisRegion, setAnalysisRegion] = useState<AnalysisRegion>(stagePreferences?.defaultAnalysisRegion ?? 'full');
  const [showOverlay, setShowOverlay] = useState(stagePreferences?.showOverlayLegend ?? true);
  const pipShaderRef = useRef<PIPShaderHandle>(null);
  const { capture, isCapturing } = useFrameCapture();

  useEffect(() => {
    if (stagePreferences?.defaultAnalysisRegion) {
      setAnalysisRegion(stagePreferences.defaultAnalysisRegion);
    }
  }, [stagePreferences?.defaultAnalysisRegion]);

  useEffect(() => {
    if (typeof stagePreferences?.showOverlayLegend === 'boolean') {
      setShowOverlay(stagePreferences.showOverlayLegend);
    }
  }, [stagePreferences?.showOverlayLegend]);

  const handleCapture = useCallback(async () => {
    const imageUrl = pipShaderRef.current?.captureImage() ?? null;
    const canvas = pipShaderRef.current?.getCanvas() ?? null;

    let analysisResult: AnalysisResult | null = null;
    if (canvas && stagePreferences?.enableBackendCapture !== false) {
      analysisResult = await capture(canvas, {
        mode: 'fullBody',
        region: analysisRegion,
        userId: captureContext?.persistenceEnabled ? (captureContext.userId ?? undefined) : undefined,
        sessionId: captureContext?.persistenceEnabled ? (captureContext.sessionId ?? undefined) : undefined,
      });
    }

    onCapture?.({ imageUrl, analysisResult });
  }, [analysisRegion, capture, captureContext?.persistenceEnabled, captureContext?.sessionId, captureContext?.userId, onCapture, stagePreferences?.enableBackendCapture]);

  // Expose imperative API for keyboard shortcuts
  useImperativeHandle(ref, () => ({
    triggerCapture: () => { void handleCapture(); },
    togglePlayback: () => {
      setIsLive(prev => {
        const next = !prev;
        onPlaybackToggle?.(next);
        return next;
      });
    },
    setAnalysisRegion: (region: AnalysisRegion) => { setAnalysisRegion(region); },
  }), [handleCapture, onPlaybackToggle]);

  const getModeLabel = (region: AnalysisRegion): string => {
    switch (region) {
      case 'face':
        return 'Face Focus';
      case 'body':
        return 'Body Focus';
      default:
        return 'Full Field';
    }
  };

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const countFps = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      if (isLive) requestAnimationFrame(countFps);
    };

    if (isLive) requestAnimationFrame(countFps);
    return () => {
      frameCount = 0;
    };
  }, [isLive]);

  const handleFrameData = useCallback(
    (data: {
      brightness: number;
      colorEntropy: number;
      horizontalSymmetry?: number;
      verticalSymmetry?: number;
      saturationMean?: number;
    }) => {
      onMetricsUpdate?.(data);
    },
    [onMetricsUpdate],
  );

  const modeButtonClass = (selected: boolean) =>
    `px-2.5 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-medium tracking-[0.1em] uppercase transition-all flex items-center gap-1.5 ${
      selected
        ? 'bg-pip-accent/85 text-white shadow-[0_0_20px_rgba(178,135,255,0.34)]'
        : 'text-pip-text-secondary hover:text-pip-text-primary hover:bg-white/5'
    }`;

  return (
    <GlassCard className="mystic-stage-panel h-full min-h-0 flex flex-col overflow-hidden !p-2.5 sm:!p-3">
      <div className="mystic-stage-topbar flex items-center justify-between gap-3 px-1 pb-3 border-b border-pip-border/35">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="mystic-eyebrow">Primary Visual Stage</span>
          <span className="mystic-badge !text-[10px] !px-3 !py-1 hidden sm:inline-flex">640×480 Source</span>
        </div>
        <div className="flex items-center gap-2">
          <div aria-live="polite" aria-atomic="true" className={`mystic-badge !text-[10px] !px-2.5 !py-1 ${isLive ? 'is-success' : 'is-warning'}`}>FPS {fps}</div>
          <div className="mystic-badge !text-[10px] !px-2.5 !py-1">{getModeLabel(analysisRegion)}</div>
          {captureContext?.persistenceEnabled && captureContext.sessionId ? (
            <div className="mystic-badge !text-[10px] !px-2.5 !py-1 is-success hidden xl:inline-flex">Session Live</div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 min-h-0 py-2 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_clamp(170px,21%,230px)] gap-2">
        <div className="mystic-stage-viewport rounded-xl sm:rounded-2xl relative overflow-hidden border border-pip-border/70 bg-black/80 shadow-[0_0_0_1px_rgba(216,179,106,0.12)_inset]">
          {isLive ? (
            <PIPShader ref={pipShaderRef} className="w-full h-full" analysisRegion={analysisRegion} onFrameData={handleFrameData} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-pip-text-muted">
              <div className="text-center">
                <Pause className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-60" />
                <p className="text-xs sm:text-base">Stream paused</p>
              </div>
            </div>
          )}

          {showOverlay && (
            <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 hidden sm:flex lg:hidden flex-col gap-1.5 bg-[rgba(6,9,16,0.82)] backdrop-blur-md p-2.5 rounded-lg border border-pip-border/55 z-10">
              <div className="flex items-center gap-2 text-[10px] text-pip-text-secondary"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Body</div>
              <div className="flex items-center gap-2 text-[10px] text-pip-text-secondary"><div className="w-2 h-2 rounded-full bg-amber-400" /> Proximal</div>
              <div className="flex items-center gap-2 text-[10px] text-pip-text-secondary"><div className="w-2 h-2 rounded-full bg-orange-400" /> Distal</div>
            </div>
          )}
        </div>

        <aside className={`${stagePreferences?.showStageSignals === false ? 'hidden' : 'hidden lg:flex'} flex-col gap-2 border border-pip-border/45 rounded-xl bg-[rgba(6,9,16,0.72)] p-2`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pip-gold" />
            <span className="mystic-eyebrow">Stage Signals</span>
          </div>
          <div className="mystic-status !p-2 text-xs text-pip-text-secondary">
            <div className="flex items-center justify-between"><span>Capture mode</span><span className="mystic-data-value text-xs">{getModeLabel(analysisRegion)}</span></div>
            <div className="flex items-center justify-between mt-1"><span>Stream</span><span className="mystic-data-value text-xs">{isLive ? 'Live' : 'Paused'}</span></div>
            <div className="flex items-center justify-between mt-1"><span>Persistence</span><span className="mystic-data-value text-xs">{captureContext?.persistenceEnabled ? 'Armed' : 'Preview only'}</span></div>
          </div>
          {showOverlay && (
            <div className="mystic-status !p-2 text-xs text-pip-text-secondary flex flex-col gap-1">
              <div className="mystic-data-label text-[10px]">Overlay legend</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Body</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /> Proximal</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400" /> Distal</div>
            </div>
          )}
        </aside>
      </div>

      <div className="mystic-stage-commandbar mt-auto flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-t border-pip-border/35 pt-3">
        <div className="flex items-center gap-2">
          <button onClick={() => void handleCapture()} disabled={isCapturing} aria-label={isCapturing ? 'Capturing analysis frame' : 'Capture analysis frame'} className="mystic-btn mystic-btn-primary !px-3 sm:!px-4 !py-2 flex items-center gap-2 disabled:opacity-60">
            <Camera className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-medium">{isCapturing ? 'Capturing…' : 'Capture'}</span>
          </button>
          <button
            onClick={() => {
              const nextLive = !isLive;
              setIsLive(nextLive);
              onPlaybackToggle?.(nextLive);
            }}
            aria-label={isLive ? 'Pause stream' : 'Resume stream'}
            className={`mystic-btn ${isLive ? 'mystic-btn-secondary' : 'mystic-btn-primary'} !px-3 sm:!px-4 !py-2 flex items-center gap-2`}
          >
            {isLive ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />}
            <span className="text-xs sm:text-sm font-medium">{isLive ? 'Pause' : 'Resume'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div role="group" aria-label="Analysis region" className="flex items-center rounded-lg border border-pip-border/60 bg-[rgba(7,12,24,0.68)] p-1">
            <button onClick={() => setAnalysisRegion('full')} aria-label="Full field analysis" aria-pressed={analysisRegion === 'full'} className={modeButtonClass(analysisRegion === 'full')}>Full</button>
            <button onClick={() => setAnalysisRegion('face')} aria-label="Face focus analysis" aria-pressed={analysisRegion === 'face'} className={modeButtonClass(analysisRegion === 'face')}>
              <User className="w-3 h-3" aria-hidden="true" />
              <span className="hidden sm:inline">Face</span>
            </button>
            <button onClick={() => setAnalysisRegion('body')} aria-label="Body focus analysis" aria-pressed={analysisRegion === 'body'} className={modeButtonClass(analysisRegion === 'body')}>
              <Users className="w-3 h-3" aria-hidden="true" />
              <span className="hidden sm:inline">Body</span>
            </button>
          </div>

          <button
            onClick={() => setShowOverlay(!showOverlay)}
            aria-label={showOverlay ? 'Hide overlay legend' : 'Show overlay legend'}
            aria-pressed={showOverlay}
            className={`mystic-btn ${showOverlay ? 'mystic-btn-secondary' : 'mystic-btn-ghost'} !px-3 !py-2 flex items-center gap-1.5`}
          >
            <Layers className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs sm:text-sm hidden sm:inline">Overlay</span>
          </button>
        </div>
      </div>
    </GlassCard>
  );
});
