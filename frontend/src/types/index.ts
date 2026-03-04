/**
 * Type definitions for PIP Analysis System
 */

// PIP Shader Settings
export interface PIPSettings {
  seed: number;
  period: number;
  harmonics: number;
  spread: number;
  gain: number;
  roughness: number;
  exponent: number;
  amplitude: number;
  offset: number;
  speed: number;
  intensity: number;
  monochrome: boolean;
}

export const DEFAULT_PIP_SETTINGS: PIPSettings = {
  seed: 1348,
  period: 0.22,
  harmonics: 2,
  spread: 2.6,
  gain: 0.7,
  roughness: 0.5,
  exponent: 0.5,
  amplitude: 0.53,
  offset: 0.5,
  speed: 1.0,
  intensity: 1.0,
  monochrome: false,
};

// Real-time Metrics
export interface RealTimeMetrics {
  timestamp: number;
  avgIntensity: number;
  intensityStdDev: number;
  maxIntensity: number;
  minIntensity: number;
  lightQuantaDensity: number;
  normalizedArea: number;
  innerNoise: number;
  innerNoisePercent: number;
  horizontalSymmetry: number;
  verticalSymmetry: number;
  dominantHue: number;
  saturationMean: number;
  colorEntropy: number;
  frameToFrameChange: number;
}

// Composite Scores (0-100)
export interface CompositeScores {
  energy: number;
  symmetry: number;
  coherence: number;
  complexity: number;
  regulation: number;
  colorBalance: number;
}

// Metrics History Entry
export interface MetricsHistoryEntry {
  timestamp: number;
  metrics: Partial<RealTimeMetrics>;
  scores: Partial<CompositeScores>;
}

// Analysis Mode
export type AnalysisMode = 'fullBody' | 'face' | 'segmented';

// Baseline Data
export interface BaselineData {
  id: string;
  name: string;
  createdAt: string;
  isActive: boolean;
  metrics: Partial<RealTimeMetrics>;
  scores: Partial<CompositeScores>;
}

// Camera Device Info
export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput';
}

// WebSocket Message Types
export type WSMessageType = 
  | 'auth' 
  | 'auth_success' 
  | 'session_start' 
  | 'session_started'
  | 'session_end' 
  | 'session_ended'
  | 'frame' 
  | 'metrics' 
  | 'scores'
  | 'ping' 
  | 'pong' 
  | 'error';

export interface WSMessage {
  type: WSMessageType;
  payload?: unknown;
}

export interface WSMetricsPayload {
  timestamp: number;
  metrics: Partial<RealTimeMetrics>;
  scores: Partial<CompositeScores>;
  trends?: {
    energy: 'up' | 'down' | 'stable';
    symmetry: 'up' | 'down' | 'stable';
    coherence: 'up' | 'down' | 'stable';
  };
}

// Score Card Props
export interface ScoreCardProps {
  title: string;
  value: number;
  maxValue?: number;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
  description?: string;
}

// Analysis Result from Backend
export interface AnalysisResult {
  id: string;
  timestamp: string;
  mode: AnalysisMode;
  metrics: {
    basic: Record<string, number>;
    geometric: Record<string, unknown>;
    nonlinear?: Record<string, number>;
    color: Record<string, unknown>;
    symmetry: Record<string, number>;
  };
  scores: CompositeScores;
  segments?: SegmentedAnalysis[];
  images: {
    original: string;
    processed: string;
    heatmap?: string;
  };
  baselineComparison?: {
    energyDelta: number;
    symmetryDelta: number;
    coherenceDelta: number;
    complexityDelta: number;
    regulationDelta: number;
    colorBalanceDelta: number;
  };
}

export interface SegmentedAnalysis {
  name: string;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metrics: Record<string, number>;
  scores: {
    energy: number;
    coherence: number;
  };
}

// Zone definitions for segmentation
export interface ZoneConfig {
  proximal: number;
  distal: number;
  extended: number;
}

export const DEFAULT_ZONE_CONFIG: ZoneConfig = {
  proximal: 0.08,
  distal: 0.15,
  extended: 0.25,
};

export interface ZoneMasks {
  body: ImageData;
  proximalField: ImageData;
  distalField: ImageData;
  extendedField: ImageData;
  background: ImageData;
  combinedField: ImageData;
}

// Export format options
export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'pdf';
