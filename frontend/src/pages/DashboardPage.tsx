/**
 * Dashboard Page
 * Integrates PIP Canvas and Metrics Panels with all real-time functionality preserved
 */
import { useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PIPCanvasPanel, type PIPCanvasPanelHandle } from '../components/Panels/PIPCanvasPanel';
import { MetricsScoresPanel } from '../components/Panels/MetricsScoresPanel';
import { TimelineStrip } from '../components/Layout/TimelineStrip';
import { useRealTimeMetrics } from '../hooks/useRealTimeMetrics';
import { useSelemenePersistence } from '../hooks/useSelemenePersistence';
import { useSelemeneSettings } from '../hooks/useSelemeneSettings';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useShell } from '../components/Layout/Shell';
import { ShortcutsHelp } from '../components/UI/ShortcutsHelp';

import { useAuth } from '../context/auth/AuthContext';
import { useSelemene } from '../hooks/useSelemene';
import { SelemeneStatusBadge } from '../components/UI/SelemeneStatusBadge';
import { CoherenceRing } from '../components/UI/CoherenceRing';
import { BreathNav } from '../components/UI/BreathNav';
import { SacredGeometryOverlay } from '../components/UI/SacredGeometryOverlay';
import type { AnalysisResult, CapturedAnalysisData } from '../types';
import { StaggerContainer, StaggerItem } from '../components/Animations';
import { TodaySection } from '../components/Dashboard/TodaySection';

function buildSnapshotLabel(template: string) {
  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return template
    .replaceAll('{date}', date)
    .replaceAll('{time}', time)
    .trim();
}

export function DashboardPage() {
  const navigate = useNavigate();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const pipPanelRef = useRef<PIPCanvasPanelHandle>(null);
  const shellContext = useShell();
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  const {
    scores,
    metrics,
    timeline,
    sessionDuration,
    isConnected,
    processFrameData,
  } = useRealTimeMetrics();

  const persistence = useSelemenePersistence({
    active: true,
  });

  const {
    settings: selemeneSettings,
  } = useSelemeneSettings({
    configuredUserId: persistence.configuredUserId,
  });

  const { selemeneStatus } = useAuth();
  const { engines: selemeneEngines } = useSelemene();

  // --- Keyboard shortcuts ---
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  useKeyboardShortcuts({
    'capture': () => pipPanelRef.current?.triggerCapture(),
    'toggle-stream': () => pipPanelRef.current?.togglePlayback(),
    'region-full': () => pipPanelRef.current?.setAnalysisRegion('full'),
    'region-face': () => pipPanelRef.current?.setAnalysisRegion('face'),
    'region-body': () => pipPanelRef.current?.setAnalysisRegion('body'),
    'fullscreen': () => { void toggleFullscreen(); },
    'sidebar': () => shellContext.toggleSidebar(),
    'help': () => setShowShortcuts(true),
    'close': () => setShowShortcuts(false),
  });

  const handleMetricsUpdate = useCallback((data: {
    brightness: number;
    colorEntropy: number;
    horizontalSymmetry: number;
    verticalSymmetry: number;
    saturationMean: number;
  }) => {
    processFrameData(data);
  }, [processFrameData]);

  const handleCapture = useCallback(async (payload: { 
    imageUrl: string | null; 
    analysisResult?: AnalysisResult | null 
  }) => {
    const persisted = await persistence.recordCapture(payload.analysisResult ?? null, payload.imageUrl, {
      createSnapshot: selemeneSettings.capture.autoCreateSnapshot,
      snapshotLabel: buildSnapshotLabel(selemeneSettings.capture.snapshotLabelTemplate),
    });

    const capturedData: CapturedAnalysisData = {
      timestamp: new Date(),
      scores: { ...scores },
      metrics: { ...metrics },
      timeline: [...timeline],
      sessionDuration,
      imageUrl: payload.imageUrl ?? undefined,
      persistedReadingId: persisted.readingId,
      persistedSnapshotId: persisted.snapshotId,
      persistenceState: payload.analysisResult?.persistenceState ?? null,
      persistenceError: payload.analysisResult?.persistenceError ?? null,
      captureRoute: payload.analysisResult ? 'backend-capture' : 'local-preview',
    };

    if (persisted.readingId) {
      await persistence.completeSession(sessionDuration, persisted.readingId);
      await persistence.refreshHistory();
      await persistence.refreshBaseline();
    }

    // Navigate to analysis page with captured data
    navigate('/analysis', { state: { capturedData } });
  }, [selemeneSettings.capture, metrics, navigate, persistence, scores, sessionDuration, timeline]);

  return (
    <StaggerContainer className="h-full flex flex-col gap-1.5 sm:gap-2">
      {/* Shortcuts Help Overlay */}
      <ShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* WitnessOS Dashboard Header */}
      <StaggerItem>
        <div className="relative flex items-center justify-between gap-4 px-1">
          <SacredGeometryOverlay
            variant="seed-of-life"
            size={140}
            opacity={0.03}
            className="absolute -left-6 -top-4"
          />
          <div className="flex items-center gap-4 z-10">
            <span className="witnessOS-heading text-[11px]">Consciousness Dashboard</span>
            <SelemeneStatusBadge 
              status={selemeneStatus} 
              engineCount={selemeneEngines.length} 
            />
          </div>
          <div className="flex items-center gap-4 z-10">
            <BreathNav width={120} className="hidden sm:flex" />
            <CoherenceRing
              score={Math.round((scores.energy + scores.coherence + scores.symmetry) / 3 * 100)}
              size={52}
              label="Score"
            />
          </div>
        </div>
      </StaggerItem>

      {/* Today Section — Timing Engines */}
      <StaggerItem>
        <TodaySection />
      </StaggerItem>

      {/* Timeline Strip - Top Row */}
      <StaggerItem>
        <section className="mystic-analytics-zone h-full min-h-0">
          <TimelineStrip data={timeline} sessionDuration={sessionDuration} />
        </section>
      </StaggerItem>

      {/* Main Content - Bottom Row */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.68fr_0.92fr] gap-1.5 sm:gap-2">
        {/* PIP Canvas - Left Column */}
        <StaggerItem className="mystic-stage-zone h-full min-h-0">
          <div ref={canvasContainerRef} className="h-full">
            <PIPCanvasPanel
              ref={pipPanelRef}
              onCapture={(payload) => void handleCapture(payload)}
              onMetricsUpdate={handleMetricsUpdate}
              onPlaybackToggle={(nextLive) => {
                if (nextLive) {
                  void persistence.resumeSession();
                } else {
                  void persistence.pauseSession();
                }
              }}
              captureContext={{
                userId: persistence.configuredUserId,
                sessionId: persistence.session?.id ?? null,
                persistenceEnabled: persistence.canPersist,
              }}
              stagePreferences={{
                defaultAnalysisRegion: selemeneSettings.capture.defaultAnalysisRegion,
                showOverlayLegend: selemeneSettings.appearance.showOverlayLegend,
                showStageSignals: selemeneSettings.appearance.showStageSignals,
                enableBackendCapture: selemeneSettings.runtime.enableBackendCapture,
              }}
            />
          </div>
        </StaggerItem>

        {/* Metrics Panel - Right Column */}
        <StaggerItem className="mystic-rail-zone h-full min-h-0 overflow-auto">
          <MetricsScoresPanel 
            scores={scores} 
            metrics={metrics} 
            isBackendConnected={isConnected} 
          />
        </StaggerItem>
      </div>
    </StaggerContainer>
  );
}
