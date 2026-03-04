/**
 * MetricsGuide - Full page view for PIP metrics definitions
 */
import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface MetricDefinition {
  name: string;
  shortName: string;
  description: string;
  range: string;
  interpretation: string;
}

const SCORE_DEFINITIONS: MetricDefinition[] = [
  {
    name: 'Energy',
    shortName: 'Energy',
    description: 'Overall biofield energy level',
    range: '0-100',
    interpretation: 'Computed from Light Quanta Density (30%), Average Intensity (25%), Total Energy (25%), and Normalized Area (20%). Higher values indicate stronger biofield presence.',
  },
  {
    name: 'Symmetry',
    shortName: 'Symmetry',
    description: 'Bilateral balance and alignment',
    range: '0-100',
    interpretation: 'Based on Body SSIM (50%), Contour Balance (30%), and Color Symmetry (20%). Measures bilateral balance and alignment.',
  },
  {
    name: 'Coherence',
    shortName: 'Coherence',
    description: 'Field organization and stability',
    range: '0-100',
    interpretation: 'Derived from Pattern Regularity (35%), Temporal Stability (25%), Hurst Exponent (25%), and Color Coherence (15%). Indicates field organization.',
  },
  {
    name: 'Complexity',
    shortName: 'Complexity',
    description: 'Richness and depth of the biofield structure',
    range: '0-100',
    interpretation: 'Calculated from Fractal Dimension (30%), Color Entropy (25%), Correlation Dimension (20%), Contour Complexity (15%), and Noise (10%).',
  },
  {
    name: 'Regulation',
    shortName: 'Regulation',
    description: 'Adaptive capacity and self-regulation',
    range: '0-100',
    interpretation: 'Based on Lyapunov Exponent (30%), DFA Alpha (25%), Temporal Variance (20%), Recurrence Rate (15%), and Stability (10%). Reflects adaptive capacity.',
  },
  {
    name: 'Color Balance',
    shortName: 'Color Bal',
    description: 'Chromatic harmony and distribution',
    range: '0-100',
    interpretation: 'Measures Color Uniformity (30%), Hue Balance (25%), Saturation Consistency (20%), Coherence (15%), and Symmetry (10%).',
  },
];

const METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    name: 'Light Quanta Density',
    shortName: 'LQD',
    description: 'Density of light emission per unit area',
    range: '0-1',
    interpretation: 'Higher = more photon emission activity',
  },
  {
    name: 'Average Intensity',
    shortName: 'Avg Intensity',
    description: 'Mean brightness level across the analyzed region',
    range: '0-255',
    interpretation: 'Baseline luminosity of the field',
  },
  {
    name: 'Inner Noise',
    shortName: 'Inner Noise',
    description: 'Variation in intensity within the body region',
    range: '0-100%',
    interpretation: 'Lower = more uniform field distribution',
  },
  {
    name: 'Fractal Dimension',
    shortName: 'Fractal Dim',
    description: 'Complexity measure of field patterns',
    range: '1.0-2.0',
    interpretation: 'Higher = more complex structure',
  },
  {
    name: 'Hurst Exponent',
    shortName: 'Hurst Exp',
    description: 'Long-range correlation in field dynamics',
    range: '0-1',
    interpretation: 'Closer to 0.5 = random; >0.5 = persistent; <0.5 = anti-persistent',
  },
  {
    name: 'Horizontal Symmetry',
    shortName: 'H-Symmetry',
    description: 'Left-right symmetry of the field',
    range: '0-100%',
    interpretation: 'Higher = more balanced bilateral distribution',
  },
  {
    name: 'Vertical Symmetry',
    shortName: 'V-Symmetry',
    description: 'Top-bottom symmetry of the field',
    range: '0-100%',
    interpretation: 'Higher = more balanced vertical distribution',
  },
];

interface MetricsGuideProps {
  onBack: () => void;
}

export const MetricsGuide: React.FC<MetricsGuideProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen flex flex-col mystic-bg text-pip-text-primary font-sans">
      {/* Header */}
      <header className="border-b border-pip-border/70 bg-[rgba(5,8,16,0.72)] px-4 py-3 flex items-center gap-4 sticky top-0 z-10 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="mystic-btn mystic-btn-ghost !px-2.5 !py-2"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-white">PIP Metrics Guide</h1>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Composite Scores Section */}
          <section>
            <h2 className="text-2xl font-bold text-pip-accent mb-6 tracking-tight">Composite Scores</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {SCORE_DEFINITIONS.map((metric) => (
                <div 
                  key={metric.name} 
                  className="group mystic-card !rounded-2xl !p-5 hover:!border-pip-accent/45 hover:shadow-[0_0_22px_rgba(143,94,255,0.18)] transition-all duration-300"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-pip-accent transition-colors">
                        {metric.name}
                      </h3>
                      <p className="text-xs text-pip-text-muted font-mono bg-white/5 px-2 py-0.5 rounded inline-block">
                        {metric.range}
                      </p>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-sm text-pip-text-secondary mb-3 leading-relaxed">
                    {metric.description}
                  </p>
                  
                  {/* Interpretation */}
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-xs text-pip-accent/90 leading-relaxed">
                      {metric.interpretation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Live Metrics Section */}
          <section>
            <h2 className="text-2xl font-bold text-pip-accent mb-6 tracking-tight">Live Metrics</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {METRIC_DEFINITIONS.map((metric) => (
                <div 
                  key={metric.name} 
                  className="group mystic-card !rounded-2xl !p-5 hover:!border-pip-accent/45 hover:shadow-[0_0_22px_rgba(143,94,255,0.18)] transition-all duration-300"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-pip-accent transition-colors">
                        {metric.name}
                      </h3>
                      <p className="text-xs text-pip-text-muted font-mono bg-white/5 px-2 py-0.5 rounded inline-block">
                        {metric.range}
                      </p>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-sm text-pip-text-secondary mb-3 leading-relaxed">
                    {metric.description}
                  </p>
                  
                  {/* Interpretation */}
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-xs text-pip-accent/90 leading-relaxed">
                      {metric.interpretation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Analysis Modes Section */}
          <section>
            <h2 className="text-2xl font-bold text-pip-accent mb-6 tracking-tight">Analysis Modes</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="group mystic-card !rounded-2xl !p-5 hover:!border-pip-accent/45 hover:shadow-[0_0_22px_rgba(143,94,255,0.18)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pip-accent/10 flex items-center justify-center">
                    <span className="text-pip-accent font-bold text-lg">F</span>
                  </div>
                  <h3 className="font-semibold text-white text-lg group-hover:text-pip-accent transition-colors">
                    Full Body Analysis
                  </h3>
                </div>
                <p className="text-sm text-pip-text-secondary leading-relaxed">
                  Analyzes the entire biofield around the subject. Best for overall energy assessment and full-body symmetry evaluation.
                </p>
              </div>
              
              <div className="group mystic-card !rounded-2xl !p-5 hover:!border-pip-accent/45 hover:shadow-[0_0_22px_rgba(143,94,255,0.18)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pip-accent/10 flex items-center justify-center">
                    <span className="text-pip-accent font-bold text-lg">Fc</span>
                  </div>
                  <h3 className="font-semibold text-white text-lg group-hover:text-pip-accent transition-colors">
                    Face Analysis
                  </h3>
                </div>
                <p className="text-sm text-pip-text-secondary leading-relaxed">
                  Focuses on facial region and head area. Useful for emotional state and mental energy assessment.
                </p>
              </div>
              
              <div className="group mystic-card !rounded-2xl !p-5 hover:!border-pip-accent/45 hover:shadow-[0_0_22px_rgba(143,94,255,0.18)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pip-accent/10 flex items-center justify-center">
                    <span className="text-pip-accent font-bold text-lg">S</span>
                  </div>
                  <h3 className="font-semibold text-white text-lg group-hover:text-pip-accent transition-colors">
                    Segmented Analysis
                  </h3>
                </div>
                <p className="text-sm text-pip-text-secondary leading-relaxed">
                  Divides the body into zones (head, torso, limbs) for detailed regional analysis. Helps identify energy imbalances.
                </p>
              </div>
            </div>
          </section>

          {/* Symmetry Snapshot Section */}
          <section className="pb-8">
            <h2 className="text-2xl font-bold text-pip-accent mb-6 tracking-tight">Symmetry Snapshot</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="group mystic-card !rounded-2xl !p-5 hover:!border-pip-accent/45 hover:shadow-[0_0_22px_rgba(143,94,255,0.18)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pip-accent/10 flex items-center justify-center">
                    <span className="text-pip-accent font-bold text-lg">↔</span>
                  </div>
                  <h3 className="font-semibold text-white text-lg group-hover:text-pip-accent transition-colors">
                    Inner (Body) Symmetry
                  </h3>
                </div>
                <p className="text-sm text-pip-text-secondary leading-relaxed">
                  Horizontal bilateral symmetry - compares left and right halves of the analyzed region.
                </p>
              </div>
              
              <div className="group mystic-card !rounded-2xl !p-5 hover:!border-pip-accent/45 hover:shadow-[0_0_22px_rgba(143,94,255,0.18)] transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pip-accent/10 flex items-center justify-center">
                    <span className="text-pip-accent font-bold text-lg">↕</span>
                  </div>
                  <h3 className="font-semibold text-white text-lg group-hover:text-pip-accent transition-colors">
                    Outer (Field) Symmetry
                  </h3>
                </div>
                <p className="text-sm text-pip-text-secondary leading-relaxed">
                  Vertical symmetry - compares top and bottom halves of the analyzed region.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default MetricsGuide;

