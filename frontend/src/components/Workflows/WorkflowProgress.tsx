/**
 * WorkflowProgress — Per-engine status during workflow execution
 * Shows spinning/done/failed state for each engine in the workflow.
 */
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { WorkflowResult } from '../../types/selemene';

interface WorkflowProgressProps {
  isLoading: boolean;
  engines: string[];
  result: WorkflowResult | null;
}

export function WorkflowProgress({ isLoading, engines, result }: WorkflowProgressProps) {
  if (!isLoading && !result) return null;

  return (
    <div className="mystic-panel !p-4">
      <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium block mb-3">
        Engine Progress
      </span>
      <div className="flex flex-wrap gap-2">
        {engines.map(engineId => {
          const hasResult = result?.engine_outputs?.[engineId];
          const isDone = !!hasResult;
          return (
            <div key={engineId} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs ${
              isDone ? 'border-pip-emerald/40 bg-pip-emerald/10 text-pip-emerald' :
              isLoading ? 'border-pip-gold/30 bg-pip-gold/5 text-pip-gold' :
              'border-pip-danger/30 bg-pip-danger/5 text-pip-danger'
            }`}>
              {isDone ? <CheckCircle2 className="w-3 h-3" /> :
               isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> :
               <XCircle className="w-3 h-3" />}
              {engineId}
            </div>
          );
        })}
      </div>
      {result && (
        <p className="text-xs text-pip-text-muted mt-2">
          Completed in {result.total_time_ms.toFixed(0)}ms
        </p>
      )}
    </div>
  );
}
