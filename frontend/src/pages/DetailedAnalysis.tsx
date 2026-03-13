import React, { useState, useMemo, useCallback } from 'react';
import { GlassCard } from '../components/Cards/GlassCard';
import {
  ArrowLeft,
  Share2,
  ZoomIn,
  ZoomOut,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  BarChart3,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  FileDown
} from 'lucide-react';
import { pdfExportService } from '../services/PDFExportService';

// Types for captured analysis data
export interface CapturedAnalysisData {
  timestamp: Date;
  scores: {
    energy: number;
    symmetry: number;
    coherence: number;
    complexity: number;
    regulation: number;
    colorBalance: number;
  };
  metrics: {
    lqd: number;
    avgIntensity: number;
    innerNoise: number;
    fractalDim: number;
    hurstExp: number;
    horizontalSymmetry: number;
    verticalSymmetry: number;
  };
  timeline: Array<{
    time: number;
    energy: number;
    symmetry: number;
    coherence: number;
  }>;
  sessionDuration: number;
  imageUrl?: string;
  persistedReadingId?: string | null;
  persistedSnapshotId?: string | null;
  persistenceState?: string | null;
  persistenceError?: string | null;
  captureRoute?: 'backend-capture' | 'local-preview';
}

interface DetailedAnalysisProps {
  onBack: () => void;
  capturedData: CapturedAnalysisData;
}

// Generate dynamic insights based on actual scores
const generateInsights = (scores: CapturedAnalysisData['scores'], metrics: CapturedAnalysisData['metrics']): Array<{ type: 'positive' | 'warning' | 'info'; text: string }> => {
  const insights: Array<{ type: 'positive' | 'warning' | 'info'; text: string }> = [];

  // Energy insights
  if (scores.energy >= 80) {
    insights.push({ type: 'positive', text: 'Strong energy field detected with excellent vitality indicators.' });
  } else if (scores.energy >= 60) {
    insights.push({ type: 'info', text: 'Moderate energy levels detected. Consider energizing activities.' });
  } else {
    insights.push({ type: 'warning', text: 'Low energy indicators. Rest and rejuvenation recommended.' });
  }

  // Symmetry insights
  if (scores.symmetry >= 80) {
    insights.push({ type: 'positive', text: 'Excellent bilateral symmetry indicates good energetic alignment.' });
  } else if (scores.symmetry >= 60) {
    insights.push({ type: 'info', text: 'Moderate symmetry detected. Balance exercises may be beneficial.' });
  } else {
    insights.push({ type: 'warning', text: 'Asymmetry detected - consider alignment or grounding practices.' });
  }

  // Coherence insights
  if (scores.coherence >= 80) {
    insights.push({ type: 'positive', text: 'High coherence suggests excellent mind-body integration.' });
  } else if (scores.coherence >= 60) {
    insights.push({ type: 'info', text: 'Moderate coherence. Meditation or breathing exercises recommended.' });
  } else {
    insights.push({ type: 'warning', text: 'Low coherence detected - consider stress reduction techniques.' });
  }

  // Complexity insights (optimal is moderate)
  if (scores.complexity >= 40 && scores.complexity <= 70) {
    insights.push({ type: 'positive', text: 'Healthy complexity pattern indicating adaptive energy dynamics.' });
  } else if (scores.complexity > 70) {
    insights.push({ type: 'info', text: 'High complexity may indicate active processing or stress.' });
  } else {
    insights.push({ type: 'info', text: 'Low complexity may indicate a calm, stable state.' });
  }

  // Color Balance insights
  if (scores.colorBalance >= 80) {
    insights.push({ type: 'positive', text: 'Excellent color balance suggests emotional equilibrium.' });
  } else if (scores.colorBalance < 50) {
    insights.push({ type: 'warning', text: 'Color imbalance detected - emotional regulation may be beneficial.' });
  }

  // Regulation insights
  if (scores.regulation >= 80) {
    insights.push({ type: 'positive', text: 'Strong self-regulation patterns detected.' });
  } else if (scores.regulation < 50) {
    insights.push({ type: 'warning', text: 'Regulation patterns suggest possible dysregulation - relaxation recommended.' });
  }

  // Fractal dimension insight
  if (metrics.fractalDim >= 1.5) {
    insights.push({ type: 'info', text: `Fractal dimension of ${metrics.fractalDim.toFixed(2)} indicates rich energetic patterns.` });
  }

  return insights.slice(0, 6); // Limit to 6 insights
};

const getPersistenceBadge = (capturedData: CapturedAnalysisData) => {
  if (capturedData.persistedReadingId) {
    return {
      label: 'Persisted',
      className: 'is-success',
      detail: 'This result is stored in Selene and can be revisited through persisted history surfaces.',
    };
  }

  if (capturedData.persistenceState === 'disabled') {
    return {
      label: 'Persistence Disabled',
      className: 'is-warning',
      detail: 'The capture completed, but persistence was disabled for this run.',
    };
  }

  if (capturedData.persistenceState === 'error') {
    return {
      label: 'Persistence Error',
      className: 'is-danger',
      detail: capturedData.persistenceError || 'The analysis completed, but the persistence step reported an error.',
    };
  }

  return {
    label: 'Preview Only',
    className: '',
    detail: 'This result was generated for local review and was not saved as a persisted reading.',
  };
};

const getSnapshotBadge = (capturedData: CapturedAnalysisData) => {
  if (capturedData.persistedSnapshotId) {
    return {
      label: 'Snapshot Linked',
      className: 'is-success',
      detail: 'A snapshot record exists and can be reopened through Account history.',
    };
  }

  return {
    label: 'No Snapshot',
    className: '',
    detail: capturedData.persistedReadingId
      ? 'A reading exists, but no snapshot was linked for this result.'
      : 'No snapshot exists because this capture did not create a persisted record.',
  };
};

const getRouteBadge = (capturedData: CapturedAnalysisData) => {
  if (capturedData.captureRoute === 'backend-capture') {
    return {
      label: 'Backend Capture',
      className: 'is-success',
      detail: 'This detail view was created from the backend-backed capture path.',
    };
  }

  return {
    label: 'Local Preview',
    className: '',
    detail: 'This detail view is based on the local preview path rather than a persisted backend capture.',
  };
};

export const DetailedAnalysis: React.FC<DetailedAnalysisProps> = ({ onBack, capturedData }) => {
  const [showZones, setShowZones] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('scores');
  const [notes, setNotes] = useState('');

  // Debug: log received data
  console.log('DetailedAnalysis received capturedData.imageUrl:', capturedData.imageUrl ? `${capturedData.imageUrl.substring(0, 50)}...` : 'undefined');

  // Convert captured data to display format
  const scoresList = useMemo(() => {
    const { scores, timeline } = capturedData;

    // Calculate trend from timeline (last 5 points if available)
    const getTrend = (metricName: 'energy' | 'symmetry' | 'coherence', currentValue: number): 'up' | 'down' | 'stable' => {
      if (timeline.length < 2) return 'stable';
      const recentValues = timeline.slice(-5).map(t => t[metricName]);
      const firstValue = recentValues[0];
      if (currentValue > firstValue + 5) return 'up';
      if (currentValue < firstValue - 5) return 'down';
      return 'stable';
    };

    // Get history from timeline (last 5 data points)
    const getHistory = (metricName: 'energy' | 'symmetry' | 'coherence', currentValue: number): number[] => {
      const historyFromTimeline = timeline.slice(-4).map(t => t[metricName]);
      return [...historyFromTimeline, currentValue];
    };

    return [
      { name: 'Energy', value: scores.energy, trend: getTrend('energy', scores.energy), history: getHistory('energy', scores.energy) },
      { name: 'Symmetry', value: scores.symmetry, trend: getTrend('symmetry', scores.symmetry), history: getHistory('symmetry', scores.symmetry) },
      { name: 'Coherence', value: scores.coherence, trend: getTrend('coherence', scores.coherence), history: getHistory('coherence', scores.coherence) },
      { name: 'Complexity', value: scores.complexity, trend: 'stable' as const, history: [scores.complexity, scores.complexity, scores.complexity, scores.complexity, scores.complexity] },
      { name: 'Regulation', value: scores.regulation, trend: 'stable' as const, history: [scores.regulation, scores.regulation, scores.regulation, scores.regulation, scores.regulation] },
      { name: 'Color Balance', value: scores.colorBalance, trend: 'stable' as const, history: [scores.colorBalance, scores.colorBalance, scores.colorBalance, scores.colorBalance, scores.colorBalance] },
    ];
  }, [capturedData]);

  // Convert metrics to display format
  const metricsList = useMemo(() => {
    const { metrics } = capturedData;
    return [
      { name: 'LQD', value: metrics.lqd.toFixed(2), unit: '' },
      { name: 'Avg Intensity', value: Math.round(metrics.avgIntensity).toString(), unit: '' },
      { name: 'Inner Noise', value: metrics.innerNoise.toFixed(1), unit: '%' },
      { name: 'Fractal Dim', value: metrics.fractalDim.toFixed(2), unit: '' },
      { name: 'Hurst Exp', value: metrics.hurstExp.toFixed(2), unit: '' },
      { name: 'H. Symmetry', value: (metrics.horizontalSymmetry * 100).toFixed(0), unit: '%' },
      { name: 'V. Symmetry', value: (metrics.verticalSymmetry * 100).toFixed(0), unit: '%' },
    ];
  }, [capturedData]);

  // Estimate zone data from overall metrics (simplified estimation)
  const zoneData = useMemo(() => {
    const { scores } = capturedData;
    return [
      { zone: 'Body', energy: scores.energy, symmetry: scores.symmetry, coherence: Math.round(scores.coherence * 1.1) },
      { zone: 'Proximal', energy: Math.round(scores.energy * 0.85), symmetry: Math.round(scores.symmetry * 0.85), coherence: Math.round(scores.coherence * 0.8) },
      { zone: 'Distal', energy: Math.round(scores.energy * 0.6), symmetry: Math.round(scores.symmetry * 0.7), coherence: Math.round(scores.coherence * 0.6) },
      { zone: 'Background', energy: Math.round(scores.energy * 0.25), symmetry: Math.round(scores.symmetry * 1.05), coherence: Math.round(scores.coherence * 1.2) },
    ].map(z => ({
      ...z,
      energy: Math.min(100, Math.max(0, z.energy)),
      symmetry: Math.min(100, Math.max(0, z.symmetry)),
      coherence: Math.min(100, Math.max(0, z.coherence)),
    }));
  }, [capturedData]);

  // Generate dynamic insights based on actual data
  const insights = useMemo(() => generateInsights(capturedData.scores, capturedData.metrics), [capturedData]);
  const persistenceBadge = useMemo(() => getPersistenceBadge(capturedData), [capturedData]);
  const snapshotBadge = useMemo(() => getSnapshotBadge(capturedData), [capturedData]);
  const routeBadge = useMemo(() => getRouteBadge(capturedData), [capturedData]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-pip-success" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-pip-danger" />;
      default: return <Minus className="w-3 h-3 text-pip-text-muted" />;
    }
  };

  const getScoreColor = (value: number) => {
    if (value >= 80) return 'text-pip-success';
    if (value >= 50) return 'text-pip-warning';
    return 'text-pip-danger';
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    console.log('Starting PDF export with data:', {
      hasImage: !!capturedData.imageUrl,
      insightsCount: insights.length,
      notesLength: notes.length
    });
    try {
      await pdfExportService.generateReport(capturedData, insights, notes);
      console.log('PDF export completed successfully');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to generate PDF. Please check the console for details.');
    } finally {
      setIsExporting(false);
    }
  }, [capturedData, insights, notes]);

  return (
    <div className="min-h-screen mystic-bg text-pip-text-primary">
      {/* Header */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between border-b border-pip-border/70 bg-[rgba(5,8,16,0.72)] backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="mystic-btn mystic-btn-ghost !px-2.5 !py-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm sm:text-lg font-semibold text-white">Detailed Analysis</h1>
            <p className="text-[10px] sm:text-xs text-pip-text-muted">
              Captured {capturedData.timestamp.toLocaleDateString()} at {capturedData.timestamp.toLocaleTimeString()} • Session: {formatDuration(capturedData.sessionDuration)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`mystic-badge ${persistenceBadge.className}`}>{persistenceBadge.label}</span>
              <span className={`mystic-badge ${snapshotBadge.className}`}>{snapshotBadge.label}</span>
              <span className={`mystic-badge ${routeBadge.className}`}>{routeBadge.label}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="mystic-btn mystic-btn-ghost !px-2.5 !py-2" title="Share">
            <Share2 className="w-4 h-4 text-pip-text-secondary" />
          </button>
          <button
            className="mystic-btn mystic-btn-secondary !px-2.5 !py-2"
            title="Export as PDF"
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            <FileDown className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''} text-pip-text-secondary`} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-2 sm:p-4 lg:p-6">
        <div className="max-w-[1920px] mx-auto space-y-3 sm:space-y-4 lg:space-y-6">
          <GlassCard className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-white">Provenance & Persistence</h2>
                <p className="text-xs text-pip-text-secondary">{persistenceBadge.detail}</p>
                <p className="text-xs text-pip-text-secondary">{snapshotBadge.detail}</p>
                <p className="text-xs text-pip-text-secondary">{routeBadge.detail}</p>
                {capturedData.persistenceError ? (
                  <p className="text-xs text-rose-300">{capturedData.persistenceError}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 w-full lg:max-w-[58rem]">
                <div className="mystic-status !p-3">
                  <div className="mystic-data-label">Persistence state</div>
                  <div className="mystic-data-value text-sm">{persistenceBadge.label}</div>
                </div>
                <div className="mystic-status !p-3">
                  <div className="mystic-data-label">Capture route</div>
                  <div className="mystic-data-value text-sm">{routeBadge.label}</div>
                </div>
                <div className="mystic-status !p-3">
                  <div className="mystic-data-label">Reading ID</div>
                  <div className="text-xs text-pip-text-primary break-all">{capturedData.persistedReadingId ?? 'Not persisted'}</div>
                </div>
                <div className="mystic-status !p-3">
                  <div className="mystic-data-label">Snapshot ID</div>
                  <div className="text-xs text-pip-text-primary break-all">{capturedData.persistedSnapshotId ?? 'No snapshot linked'}</div>
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-6">
          
          {/* Left Column - Visual Analysis */}
          <div className="lg:col-span-5 space-y-3 sm:space-y-4">
            <GlassCard className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Visual Analysis</h2>
                <div className="flex gap-1.5">
                  <button className="mystic-btn mystic-btn-ghost !px-2 !py-1.5">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button className="mystic-btn mystic-btn-ghost !px-2 !py-1.5">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className={`mystic-btn ${showZones ? 'mystic-btn-secondary' : 'mystic-btn-ghost'} !px-2 !py-1.5`}
                    onClick={() => setShowZones(!showZones)}
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              {/* Image Viewer */}
              <div className="aspect-[16/10] bg-black/40 rounded-lg relative overflow-hidden border border-white/5">
                {capturedData.imageUrl ? (
                  <img
                    src={capturedData.imageUrl}
                    alt="Captured PIP Analysis"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-pip-text-muted">
                    <span className="text-sm">No image captured</span>
                  </div>
                )}

                {/* Zone Overlay */}
                {showZones && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-[20%] border-2 border-green-500/30 rounded-full" />
                    <div className="absolute inset-[10%] border border-yellow-500/20 rounded-full" />
                    <div className="absolute inset-[5%] border border-orange-500/10 rounded-full" />
                  </div>
                )}
              </div>

              {/* Zone Legend */}
              <div className="flex flex-wrap gap-3 mt-3 text-[10px] sm:text-xs text-pip-text-secondary">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" /> Body
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" /> Proximal
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500" /> Distal
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-500" /> Background
                </div>
              </div>
            </GlassCard>

            {/* Zone Breakdown - Mobile Collapsible */}
            <GlassCard className="p-3 sm:p-4">
              <button 
                className="w-full flex items-center justify-between mb-3"
                onClick={() => toggleSection('zones')}
              >
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-pip-accent" />
                  Zone Breakdown
                </h2>
                {expandedSection === 'zones' ? 
                  <ChevronUp className="w-4 h-4 text-pip-text-muted lg:hidden" /> : 
                  <ChevronDown className="w-4 h-4 text-pip-text-muted lg:hidden" />
                }
              </button>
              
              <div className={`space-y-3 ${expandedSection === 'zones' ? 'block' : 'hidden lg:block'}`}>
                {zoneData.map((zone) => (
                  <div key={zone.zone} className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs font-medium text-white mb-2">{zone.zone}</div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <div className="text-pip-text-muted">Energy</div>
                        <div className={getScoreColor(zone.energy)}>{zone.energy}</div>
                      </div>
                      <div>
                        <div className="text-pip-text-muted">Symmetry</div>
                        <div className={getScoreColor(zone.symmetry)}>{zone.symmetry}</div>
                      </div>
                      <div>
                        <div className="text-pip-text-muted">Coherence</div>
                        <div className={getScoreColor(zone.coherence)}>{zone.coherence}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Center Column - Metrics Explorer */}
          <div className="lg:col-span-4 space-y-3 sm:space-y-4">
            {/* Composite Scores */}
            <GlassCard className="p-3 sm:p-4">
              <button 
                className="w-full flex items-center justify-between mb-3"
                onClick={() => toggleSection('scores')}
              >
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-pip-accent" />
                  Composite Scores
                </h2>
                {expandedSection === 'scores' ? 
                  <ChevronUp className="w-4 h-4 text-pip-text-muted lg:hidden" /> : 
                  <ChevronDown className="w-4 h-4 text-pip-text-muted lg:hidden" />
                }
              </button>
              
              <div className={`grid grid-cols-2 gap-2 ${expandedSection === 'scores' ? 'block' : 'hidden lg:grid'}`}>
                {scoresList.map((score) => (
                  <div key={score.name} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-pip-text-muted uppercase">{score.name}</span>
                      {getTrendIcon(score.trend)}
                    </div>
                    <div className={`text-xl font-bold ${getScoreColor(score.value)}`}>
                      {Math.round(score.value)}
                    </div>
                    {/* Mini Sparkline */}
                    <div className="flex items-end gap-0.5 h-4 mt-2">
                      {score.history.map((v, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-pip-accent/30 rounded-sm"
                          style={{ height: `${Math.max(0, Math.min(100, v))}%` }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Raw Metrics Table */}
            <GlassCard className="p-3 sm:p-4">
              <button 
                className="w-full flex items-center justify-between mb-3"
                onClick={() => toggleSection('metrics')}
              >
                <h2 className="text-sm font-semibold text-white">Raw Metrics</h2>
                {expandedSection === 'metrics' ? 
                  <ChevronUp className="w-4 h-4 text-pip-text-muted lg:hidden" /> : 
                  <ChevronDown className="w-4 h-4 text-pip-text-muted lg:hidden" />
                }
              </button>
              
              <div className={`space-y-1 ${expandedSection === 'metrics' ? 'block' : 'hidden lg:block'}`}>
                {metricsList.map((metric) => (
                  <div
                    key={metric.name}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-xs text-pip-text-secondary">{metric.name}</span>
                    <span className="text-sm font-mono text-white">
                      {metric.value}<span className="text-pip-text-muted text-xs">{metric.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Right Column - Insights & Actions */}
          <div className="lg:col-span-3 space-y-3 sm:space-y-4">
            {/* AI Insights */}
            <GlassCard className="p-3 sm:p-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-pip-accent" />
                Insights
              </h2>
              
              <div className="space-y-2">
                {insights.map((insight, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2.5 rounded-lg border ${
                      insight.type === 'positive'
                        ? 'bg-green-500/10 border-green-500/20 text-green-300'
                        : insight.type === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                    }`}
                  >
                    {insight.text}
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Session Notes */}
            <GlassCard className="p-3 sm:p-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-pip-accent" />
                Session Notes
              </h2>
              
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your observations..."
                className="w-full h-32 bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-pip-accent/50 resize-none"
              />
            </GlassCard>

            {/* Export Options */}
            <GlassCard className="p-3 sm:p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Export Report</h2>

              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="w-full mystic-btn mystic-btn-primary !py-3 text-center flex items-center justify-center gap-2"
              >
                <FileDown className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''}`} />
                <span className="text-sm font-medium">
                  {isExporting ? 'Generating PDF...' : 'Export as PDF'}
                </span>
              </button>

              <p className="text-[10px] text-pip-text-muted mt-2 text-center">
                Includes image, scores, metrics, insights, and notes
              </p>
            </GlassCard>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
};
