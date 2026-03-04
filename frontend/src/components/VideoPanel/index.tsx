/**
 * Video Panel - contains the PIP canvas and video controls
 */
import { useEffect, useCallback, useState } from 'react';
import { Pause, Play, Settings, History, CameraOff } from 'lucide-react';
import { useCamera } from '../../hooks/useCamera';
import { usePIPRenderer } from '../../hooks/usePIPRenderer';
import { useAppState } from '../../context/appState';
import { useFrameCapture } from '../../hooks/useFrameCapture';
import { PIPControlPanel } from './PIPControlPanel';
import { CaptureButton } from './CaptureButton';
import { AnalysisResultModal } from './AnalysisResultModal';
import { AnalysisModeSelector } from './AnalysisModeSelector';
import type { AnalysisResult, CompositeScores } from '../../types';

export function VideoPanel() {
  const { state, setPlaying, setPaused, toggleControls, dispatch } = useAppState();
  const { showControls, analysisMode, pipSettings } = state;

  const {
    videoRef,
    isPlaying,
    isLoading,
    error: cameraError,
    start: startCamera,
    pause: pauseCamera,
    resume: resumeCamera,
  } = useCamera({ width: 640, height: 480 });
  const pip = usePIPRenderer();
  const { canvasRef, init: initPip, pause: pausePip, resume: resumePip } = pip;
  const frameCapture = useFrameCapture();
  
  const [showResult, setShowResult] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);

  // Initialize PIP renderer when camera starts
  useEffect(() => {
    if (isPlaying && videoRef.current && canvasRef.current) {
      initPip(videoRef.current);
      setPlaying(true);
    }
  }, [isPlaying, videoRef, canvasRef, initPip, setPlaying]);

  // Handle start camera
  const handleStart = useCallback(async () => {
    await startCamera();
  }, [startCamera]);

  // Handle pause/resume
  const handlePauseResume = useCallback(() => {
    if (state.isPaused) {
      resumeCamera();
      resumePip();
      setPaused(false);
    } else {
      pauseCamera();
      pausePip();
      setPaused(true);
    }
  }, [state.isPaused, resumeCamera, resumePip, pauseCamera, pausePip, setPaused]);

  // Handle capture with backend analysis
  const handleCapture = useCallback(async () => {
    if (!canvasRef.current) return;
    
    dispatch({ type: 'SET_CAPTURING', payload: true });
    
    const result = await frameCapture.capture(canvasRef.current, {
      mode: analysisMode,
      pipSettings: pipSettings,
    });
    
    dispatch({ type: 'SET_CAPTURING', payload: false });
    
    if (result) {
      setCurrentResult(result);
      setShowResult(true);
      
      // Update scores in state
      dispatch({ type: 'SET_COMPOSITE_SCORES', payload: result.scores });
    }
  }, [canvasRef, frameCapture, analysisMode, pipSettings, dispatch]);

  return (
    <div className="flex flex-col h-full">
      {/* Video/Canvas Container */}
      <div className="relative flex-1 bg-black rounded-lg overflow-hidden">
        {/* Hidden video element for camera feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="hidden"
        />
        
        {/* PIP Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
        />
        
        {/* Overlay when not playing */}
        {!isPlaying && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80">
            <CameraOff className="w-16 h-16 text-gray-600 mb-4" />
            <p className="text-gray-400 mb-4">Camera not active</p>
            <button
              onClick={handleStart}
              disabled={isLoading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Starting...' : 'Start Camera'}
            </button>
            {cameraError && (
              <p className="mt-4 text-red-400 text-sm">{cameraError}</p>
            )}
          </div>
        )}
        
        {/* Capture flash effect */}
        {frameCapture.isCapturing && (
          <div className="absolute inset-0 bg-white animate-flash pointer-events-none" />
        )}
      </div>
      
      {/* Analysis Mode Selector */}
      <AnalysisModeSelector />
      
      {/* Controls Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-800/50 backdrop-blur rounded-b-lg">
        <div className="flex items-center gap-2">
          {/* Capture Button with feedback */}
          <CaptureButton
            onCapture={handleCapture}
            isCapturing={frameCapture.isCapturing}
            disabled={!isPlaying}
            progress={frameCapture.progress}
            error={frameCapture.error}
            success={!!frameCapture.lastResult}
          />
          
          {/* Pause/Play Button */}
          <button
            onClick={handlePauseResume}
            disabled={!isPlaying && !state.isPaused}
            className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors disabled:opacity-50"
            title={state.isPaused ? 'Resume' : 'Pause'}
          >
            {state.isPaused ? (
              <Play className="w-5 h-5" />
            ) : (
              <Pause className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button
            onClick={toggleControls}
            className={`p-3 rounded-full transition-colors ${
              showControls
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title="PIP Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          {/* History Button */}
          <button
            onClick={() => dispatch({ type: 'SET_SHOW_HISTORY', payload: true })}
            className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors"
            title="History"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* PIP Control Panel (Collapsible) */}
      {showControls && <PIPControlPanel pipRenderer={pip} />}
      
      {/* Analysis Result Modal */}
      {showResult && currentResult && (
        <AnalysisResultModal
          result={currentResult}
          onClose={() => setShowResult(false)}
          baselineScores={state.baseline?.scores as CompositeScores | undefined}
        />
      )}
    </div>
  );
}

export default VideoPanel;
