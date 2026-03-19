/**
 * WorkflowCard — Selector card for a Selemene workflow
 */
import { Play, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WorkflowCardProps {
  workflowId: string;
  name: string;
  description: string;
  engines: string[];
  requiredPhase: number;
  userPhase?: number;
}

export function WorkflowCard({ workflowId, name, description, engines, requiredPhase, userPhase = 0 }: WorkflowCardProps) {
  const navigate = useNavigate();
  const isLocked = userPhase < requiredPhase;

  return (
    <div
      className={`mystic-panel !p-5 flex flex-col gap-3 transition-all duration-200 ${
        isLocked ? 'opacity-60' : 'cursor-pointer hover:border-pip-gold/40'
      }`}
      onClick={isLocked ? undefined : () => navigate(`/workflows/${workflowId}`)}
      role={isLocked ? undefined : 'button'}
      tabIndex={isLocked ? undefined : 0}
      onKeyDown={isLocked ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/workflows/${workflowId}`); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-pip-text-primary">{name}</h3>
        {isLocked ? (
          <span className="flex items-center gap-1 text-[10px] text-pip-text-muted">
            <Lock className="w-3 h-3" /> Phase {requiredPhase}
          </span>
        ) : (
          <Play className="w-4 h-4 text-pip-gold" />
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-pip-text-secondary leading-relaxed">{description}</p>

      {/* Engine pills */}
      <div className="flex flex-wrap gap-1">
        {engines.map(e => (
          <span key={e} className="px-2 py-0.5 rounded-full text-[10px] border border-pip-border/50 text-pip-text-muted">
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}
