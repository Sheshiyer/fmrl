import { Sparkles, Lightbulb, ArrowRight } from 'lucide-react';
import type { WorkflowSynthesis } from '../../types/selemene';

interface SynthesisViewProps {
  synthesis: WorkflowSynthesis;
  workflowName?: string;
}

export function SynthesisView({ synthesis, workflowName }: SynthesisViewProps) {
  return (
    <div className="mystic-panel !p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-pip-gold" />
        <h3 className="text-sm font-semibold text-pip-text-primary uppercase tracking-wider">
          {workflowName ? `${workflowName} — Synthesis` : 'Synthesis'}
        </h3>
      </div>

      {/* Key Themes */}
      {synthesis.key_themes.length > 0 && (
        <div>
          <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium block mb-2">Key Themes</span>
          <div className="flex flex-wrap gap-2">
            {synthesis.key_themes.map(theme => (
              <span key={theme} className="px-3 py-1.5 rounded-full text-xs border border-pip-gold/30 bg-pip-gold/10 text-pip-gold">
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {synthesis.insights && (
        <div>
          <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium block mb-2">
            <Lightbulb className="w-3 h-3 inline mr-1" />Insights
          </span>
          <p className="text-sm text-pip-text-secondary leading-relaxed whitespace-pre-line">
            {synthesis.insights}
          </p>
        </div>
      )}

      {/* Recommendations */}
      {synthesis.recommendations.length > 0 && (
        <div>
          <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium block mb-2">Recommendations</span>
          <ul className="flex flex-col gap-2">
            {synthesis.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-pip-text-secondary">
                <ArrowRight className="w-3.5 h-3.5 text-pip-emerald mt-0.5 flex-shrink-0" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
