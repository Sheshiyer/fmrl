/**
 * WorkflowPage
 * Placeholder for workflow execution — coming in Phase 4
 */
import { useParams } from 'react-router-dom';
import { Workflow } from 'lucide-react';

export function WorkflowPage() {
  const { workflowId } = useParams<{ workflowId: string }>();

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="mystic-panel !p-8 max-w-md text-center flex flex-col items-center gap-4">
        <Workflow className="w-10 h-10 text-pip-text-muted" />
        <h2 className="mystic-section-title text-lg font-mono">{workflowId}</h2>
        <p className="text-sm text-pip-text-secondary">
          Workflow orchestration is coming in Phase 4. This engine will coordinate
          multi-step calculations across the Selemene pipeline.
        </p>
        <span className="px-3 py-1 rounded-full text-xs border border-pip-border/50 bg-black/20 text-pip-text-muted">
          Phase 4
        </span>
      </div>
    </div>
  );
}
