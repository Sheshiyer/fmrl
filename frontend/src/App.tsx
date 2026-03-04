/**
 * PIP Analysis System - Main Application
 */
import { useState, useCallback } from 'react';
import { AppProvider } from './context/AppContext';
import { Shell } from './components/Layout/Shell';
import { PIPCanvasPanel } from './components/Panels/PIPCanvasPanel';
import { MetricsScoresPanel } from './components/Panels/MetricsScoresPanel';
import { DetailedAnalysis, type CapturedAnalysisData } from './pages/DetailedAnalysis';
import { MetricsGuide } from './pages/MetricsGuide';
import { useRealTimeMetrics } from './hooks/useRealTimeMetrics';
import { BackendLogsPanel } from './components/Debug/BackendLogsPanel';
import { NativeOnboarding } from './components/Onboarding/NativeOnboarding';

type AppView = 'dashboard' | 'analysis' | 'metricsGuide';

function AppContent() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [capturedAnalysis, setCapturedAnalysis] = useState<CapturedAnalysisData | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('biofield_onboarding_complete_v2') === 'true';
  });

  // Use the real-time metrics hook for actual score computation
  const {
    scores,
    metrics,
    timeline,
    sessionDuration,
    isConnected,
    processFrameData,
  } = useRealTimeMetrics();

  const handleMetricsUpdate = useCallback((data: {
    brightness: number;
    colorEntropy: number;
    horizontalSymmetry?: number;
    verticalSymmetry?: number;
    saturationMean?: number;
  }) => {
    processFrameData(data);
  }, [processFrameData]);

  const handleCapture = useCallback((imageUrl: string | null) => {
    // Capture the current scores, metrics, timeline, and image at the moment of capture
    setCapturedAnalysis({
      timestamp: new Date(),
      scores: { ...scores },
      metrics: { ...metrics },
      timeline: [...timeline],
      sessionDuration,
      imageUrl: imageUrl ?? undefined,
    });
    setCurrentView('analysis');
  }, [scores, metrics, timeline, sessionDuration]);

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setCapturedAnalysis(null);
  };

  const handleShowMetricsGuide = () => {
    setCurrentView('metricsGuide');
  };

  const handleOnboardingComplete = (options?: { force?: boolean }) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('biofield_onboarding_complete_v2', 'true');
      if (options?.force) {
        window.localStorage.setItem('biofield_runtime_preview_mode', 'true');
      } else {
        window.localStorage.removeItem('biofield_runtime_preview_mode');
      }
    }
    setOnboardingComplete(true);
  };

  if (!onboardingComplete) {
    return <NativeOnboarding onComplete={handleOnboardingComplete} />;
  }

  if (currentView === 'metricsGuide') {
    return <MetricsGuide onBack={handleBackToDashboard} />;
  }

  if (currentView === 'analysis' && capturedAnalysis) {
    return (
      <DetailedAnalysis
        onBack={handleBackToDashboard}
        capturedData={capturedAnalysis}
      />
    );
  }

  return (
    <>
      <Shell
        timelineData={timeline}
        sessionDuration={sessionDuration}
        isConnected={isConnected}
        onShowMetricsGuide={handleShowMetricsGuide}
      >
        <PIPCanvasPanel onCapture={handleCapture} onMetricsUpdate={handleMetricsUpdate} />
        <MetricsScoresPanel scores={scores} metrics={metrics} isBackendConnected={isConnected} />
      </Shell>
      <BackendLogsPanel />
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
