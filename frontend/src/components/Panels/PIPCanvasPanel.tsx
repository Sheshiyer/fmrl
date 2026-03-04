import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GlassCard } from '../Cards/GlassCard';
import { Camera, Pause, Play, Layers, User, Users } from 'lucide-react';
import { PIPShader, type AnalysisRegion, type PIPShaderHandle } from '../PIPCanvas/PIPShader';

interface PIPCanvasPanelProps {
  onCapture?: (imageUrl: string | null) => void;
  onMetricsUpdate?: (metrics: {
    brightness: number;
    colorEntropy: number;
    horizontalSymmetry?: number;
    verticalSymmetry?: number;
    saturationMean?: number;
  }) => void;
}

export const PIPCanvasPanel: React.FC<PIPCanvasPanelProps> = ({ onCapture, onMetricsUpdate }) => {
  const [isLive, setIsLive] = useState(true);
  const [fps, setFps] = useState(30);
  const [analysisRegion, setAnalysisRegion] = useState<AnalysisRegion>('full');
  const [showOverlay, setShowOverlay] = useState(true);
  const pipShaderRef = useRef<PIPShaderHandle>(null);

  const handleCapture = useCallback(() => {
    const imageUrl = pipShaderRef.current?.captureImage() ?? null;
    onCapture?.(imageUrl);
  }, [onCapture]);

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
    <GlassCard className="mystic-stage-panel h-full min-h-[360px] lg:min-h-0 flex flex-col overflow-hidden !p-3 sm:!p-4">
      <div className="mystic-stage-topbar flex items-center justify-between gap-3 px-1 pb-3 border-b border-pip-border/35">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="mystic-eyebrow">Primary Visual Stage</span>
          <span className="mystic-badge !text-[10px] !px-3 !py-1 hidden sm:inline-flex">640×480 Source</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`mystic-badge !text-[10px] !px-2.5 !py-1 ${isLive ? 'is-success' : 'is-warning'}`}>FPS {fps}</div>
          <div className="mystic-badge !text-[10px] !px-2.5 !py-1">{getModeLabel(analysisRegion)}</div>
        </div>
      </div>

      <div className="flex-1 min-h-[260px] py-3 sm:py-4">
        <div className="h-full rounded-xl sm:rounded-2xl relative overflow-hidden border border-pip-border/70 bg-black/80 shadow-[0_0_0_1px_rgba(216,179,106,0.12)_inset]" style={{ aspectRatio: '4/3' }}>
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
            <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 hidden sm:flex flex-col gap-1.5 bg-[rgba(6,9,16,0.82)] backdrop-blur-md p-2.5 rounded-lg border border-pip-border/55 z-10">
              <div className="flex items-center gap-2 text-[10px] text-pip-text-secondary"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Body</div>
              <div className="flex items-center gap-2 text-[10px] text-pip-text-secondary"><div className="w-2 h-2 rounded-full bg-amber-400" /> Proximal</div>
              <div className="flex items-center gap-2 text-[10px] text-pip-text-secondary"><div className="w-2 h-2 rounded-full bg-orange-400" /> Distal</div>
            </div>
          )}
        </div>
      </div>

      <div className="mystic-stage-commandbar mt-auto flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-t border-pip-border/35 pt-3">
        <div className="flex items-center gap-2">
          <button onClick={handleCapture} className="mystic-btn mystic-btn-primary !px-3 sm:!px-4 !py-2 flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span className="text-xs sm:text-sm font-medium">Capture</span>
          </button>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`mystic-btn ${isLive ? 'mystic-btn-secondary' : 'mystic-btn-primary'} !px-3 sm:!px-4 !py-2 flex items-center gap-2`}
          >
            {isLive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="text-xs sm:text-sm font-medium">{isLive ? 'Pause' : 'Resume'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-pip-border/60 bg-[rgba(7,12,24,0.68)] p-1">
            <button onClick={() => setAnalysisRegion('full')} className={modeButtonClass(analysisRegion === 'full')}>Full</button>
            <button onClick={() => setAnalysisRegion('face')} className={modeButtonClass(analysisRegion === 'face')}>
              <User className="w-3 h-3" />
              <span className="hidden sm:inline">Face</span>
            </button>
            <button onClick={() => setAnalysisRegion('body')} className={modeButtonClass(analysisRegion === 'body')}>
              <Users className="w-3 h-3" />
              <span className="hidden sm:inline">Body</span>
            </button>
          </div>

          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`mystic-btn ${showOverlay ? 'mystic-btn-secondary' : 'mystic-btn-ghost'} !px-3 !py-2 flex items-center gap-1.5`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-xs sm:text-sm hidden sm:inline">Overlay</span>
          </button>
        </div>
      </div>
    </GlassCard>
  );
};
