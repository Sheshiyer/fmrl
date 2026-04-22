/**
 * WorkflowPage — Full workflow execution page
 * Phase 4 implementation replacing the placeholder.
 * Orchestrates birth data input, workflow execution, progress tracking,
 * and result display with synthesis + per-engine grid.
 */
import { useParams } from 'react-router-dom';
import { Workflow, ShieldAlert, AlertTriangle, Play } from 'lucide-react';
import { useWorkflow } from '../hooks/useWorkflow';
import { useAppState } from '../context/appState';
import { useAuth } from '../context/auth/AuthContext';
import { useSelemene } from '../hooks/useSelemene';
import { BirthDataForm } from '../components/Shared/BirthDataForm';
import { WorkflowProgress } from '../components/Workflows/WorkflowProgress';
import { SynthesisView } from '../components/Workflows/SynthesisView';
import { EngineResultGrid } from '../components/Workflows/EngineResultGrid';
import { SacredGeometryOverlay } from '../components/UI/SacredGeometryOverlay';
import { useState, useMemo } from 'react';
import type { BirthData, EngineInput } from '../types/selemene';
import { findFallbackWorkflow } from '../data/selemeneCatalog';

export function WorkflowPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { state: { birthData } } = useAppState();
  const { result, isLoading, error, isPhaseGated, execute, reset } = useWorkflow();
  const { workflows } = useSelemene();
  const { status: authStatus } = useAuth();
  const isGuest = authStatus === 'guest';
  const [localBirthData, setLocalBirthData] = useState<BirthData | null>(birthData);

  // Convert API workflows array to lookup, or fall back to hardcoded data
  const meta = useMemo(() => {
    if (workflows.length > 0) {
      const fromApi = workflows.find(w => w.workflow_id === workflowId);
      if (fromApi) {
        return {
          name: fromApi.name,
          description: fromApi.description ?? '',
          engines: fromApi.engines,
          requiredPhase: fromApi.required_phase,
        };
      }
    }
    const fallback = findFallbackWorkflow(workflowId);
    return fallback
      ? {
          name: fallback.name,
          description: fallback.description ?? '',
          engines: fallback.engines,
          requiredPhase: fallback.required_phase,
        }
      : null;
  }, [workflows, workflowId]);

  if (!workflowId || !meta) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="mystic-panel !p-8 max-w-md text-center flex flex-col items-center gap-4">
          <AlertTriangle className="w-10 h-10 text-pip-gold" />
          <h2 className="mystic-section-title text-lg font-mono">Unknown Workflow</h2>
          <p className="text-sm text-pip-text-secondary">
            Workflow "{workflowId}" is not recognized. Check the URL and try again.
          </p>
        </div>
      </div>
    );
  }

  const handleExecute = async () => {
    if (!localBirthData || !workflowId) return;
    reset();
    const input: EngineInput = {
      birth_data: localBirthData,
      current_time: new Date().toISOString(),
      precision: 'Standard',
    };
    await execute(workflowId, input);
  };

  return (
    <div className="h-full overflow-y-auto p-6 relative">
      <SacredGeometryOverlay
        variant="flower-of-life"
        size={250}
        opacity={0.02}
        className="absolute right-4 top-8"
      />
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-pip-sacred/10 border border-pip-sacred/20">
            <Workflow className="w-6 h-6 text-pip-sacred" />
          </div>
          <div>
            <h1 className="text-xl font-mono text-pip-text-primary">{meta.name}</h1>
            <p className="text-sm text-pip-text-secondary mt-1">{meta.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] border border-pip-border/50 bg-black/20 text-pip-text-muted">
                Phase {meta.requiredPhase}+
              </span>
              <span className="text-[10px] text-pip-text-muted">
                {meta.engines.length} engine{meta.engines.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Birth Data Input */}
        <div className="mystic-panel !p-5">
          <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium block mb-3">
            Birth Data
          </span>
          <BirthDataForm
            initialData={localBirthData ?? undefined}
            onSubmit={(data) => setLocalBirthData(data)}
          />
        </div>

        {/* Execute Button */}
        <button
          onClick={handleExecute}
          disabled={isLoading || !localBirthData || isGuest}
          className="w-full mystic-panel !p-4 flex items-center justify-center gap-2 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:border-pip-gold/50 hover:bg-pip-gold/5 text-pip-gold"
        >
          <Play className="w-4 h-4" />
          {isLoading ? 'Executing Workflow...' : 'Execute Workflow'}
        </button>

        {/* Guest Sign-In Notice */}
        {isGuest && (
          <div className="mystic-panel !p-4 flex items-start gap-3 border-pip-gold/30">
            <ShieldAlert className="w-5 h-5 text-pip-gold flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-pip-gold">Sign In Required</h3>
              <p className="text-xs text-pip-text-secondary mt-1">
                Workflow execution requires a Selemene account. Sign in or create an account to run workflows.
              </p>
            </div>
          </div>
        )}

        {/* Progress */}
        <WorkflowProgress
          isLoading={isLoading}
          engines={meta.engines}
          result={result}
        />

        {/* Phase-Gated Warning */}
        {isPhaseGated && (
          <div className="mystic-panel !p-5 border-pip-gold/40">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-pip-gold flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-pip-gold">Consciousness Phase Required</h3>
                <p className="text-xs text-pip-text-secondary mt-1">
                  This workflow requires Phase {meta.requiredPhase} or higher. Continue your practice
                  to unlock deeper layers of FMRL.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && !isPhaseGated && (
          <div className="mystic-panel !p-5 border-pip-danger/40">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-pip-danger flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-pip-danger">Execution Failed</h3>
                <p className="text-xs text-pip-text-secondary mt-1">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <SynthesisView synthesis={result.synthesis} workflowName={meta.name} />
            <EngineResultGrid engineOutputs={result.engine_outputs} />
          </div>
        )}
      </div>
    </div>
  );
}
