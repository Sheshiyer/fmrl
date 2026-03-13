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
  persistedReadingId?: string;
  persistenceState?: string | null;
  persistenceError?: string | null;
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

// Captured analysis data for export
export interface CapturedAnalysisMetrics {
  lqd: number;
  avgIntensity: number;
  innerNoise: number;
  fractalDim: number;
  hurstExp: number;
  horizontalSymmetry: number;
  verticalSymmetry: number;
}

export interface CapturedTimelinePoint {
  time: number;
  energy: number;
  symmetry: number;
  coherence: number;
}

export interface CapturedAnalysisData {
  timestamp: Date;
  sessionDuration: number;
  scores: CompositeScores;
  metrics: CapturedAnalysisMetrics;
  timeline: CapturedTimelinePoint[];
  imageUrl?: string;
  captureRoute?: 'backend-capture' | 'local-preview';
  persistedReadingId?: string | null;
  persistedSnapshotId?: string | null;
  persistenceState?: string | null;
  persistenceError?: string | null;
}

// Persistence layer types
export interface PersistenceHealthState {
  enabled: boolean;
  healthy: boolean;
  configuredUserId?: string | null;
  backendUrl?: string;
  baseUrl?: string;
  reason?: string;
  detail?: string;
  error?: string;
}

export interface PersistedSessionRecord {
  id: string;
  user_id: string;
  status: 'active' | 'paused' | 'completed' | 'aborted';
  analysis_mode: string;
  analysis_region: string;
  source_kind: string;
  started_at: string;
  paused_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
  timeline_point_count?: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PersistedSnapshotRecord {
  id: string;
  user_id: string;
  session_id?: string | null;
  reading_id?: string | null;
  label?: string | null;
  capture_mode: string;
  analysis_region: string;
  source_kind: string;
  captured_at: string;
  created_at: string;
  updated_at: string;
}

export interface PersistedBaseline {
  id: string;
  user_id: string;
  name: string | null;
  is_active: boolean;
  source_session_id: string | null;
  source_snapshot_id: string | null;
  source_reading_id: string | null;
  baseline_scores: Record<string, number>;
  baseline_metrics: Record<string, number>;
  provenance: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface PersistedAnalysisHistoryResponse {
  items: Array<{
    id: string;
    user_id: string;
    engine_id: string;
    workflow_id: string;
    result_data: Record<string, unknown>;
    created_at: string;
  }>;
  total: number;
  limit: number;
  offset: number;
}

export interface TimelineDataPoint {
  time: number;
  energy: number;
  symmetry: number;
  coherence: number;
}

// Settings types
export interface AppearanceSettings {
  themeMode: 'sacred-dark' | 'dim' | 'high-contrast';
  workspaceDensity: 'compact' | 'balanced' | 'spacious';
  motionLevel: 'full' | 'reduced' | 'minimal';
  accentProfile: 'gold' | 'violet' | 'neutral';
  showOverlayLegend: boolean;
  showStageSignals: boolean;
}

export interface CaptureExportSettings {
  defaultAnalysisRegion: 'full' | 'face' | 'body';
  autoCreateSnapshot: boolean;
  suggestBaselineAfterCapture: boolean;
  exportBundle: ExportFormat | 'html' | 'bundle';
  snapshotLabelTemplate: string;
}

export interface RuntimeSettings {
  computeRoute?: 'python' | 'rust' | 'auto';
  persistenceEnabled?: boolean;
  realtimeEnabled?: boolean;
  showBackendLogs?: boolean;
  showDiagnosticsSummary?: boolean;
  autoFallbackToPreview?: boolean;
  enableBackendCapture?: boolean;
}

export interface ProfileSettingsResponse {
  user_id: string;
  profile_exists: boolean;
  appearance: AppearanceSettings;
  capture: CaptureExportSettings;
  settings?: SyncedBiofieldSettings;
  updated_at: string | null;
}

export interface BiofieldSettingsPreferences {
  appearance: AppearanceSettings;
  runtime: RuntimeSettings;
  capture: CaptureExportSettings;
}

export interface SettingsSyncState {
  remoteSettingsLoaded: boolean;
  isLoadingRemoteSettings: boolean;
  isSavingRemoteSettings: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  profileExists?: boolean;
}

export interface SyncedBiofieldSettings {
  appearance?: Partial<AppearanceSettings>;
  capture?: Partial<CaptureExportSettings>;
}
