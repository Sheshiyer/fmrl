import { EngineResultRenderer } from '../Engines/EngineResultRenderer';
import type { EngineOutput } from '../../types/selemene';

interface EngineResultGridProps {
  engineOutputs: Record<string, EngineOutput>;
}

export function EngineResultGrid({ engineOutputs }: EngineResultGridProps) {
  const entries = Object.entries(engineOutputs);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <span className="text-[10px] uppercase tracking-wider text-pip-text-muted font-medium px-1">
        Individual Engine Results ({entries.length})
      </span>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {entries.map(([engineId, output]) => (
          <div key={engineId} className="mystic-panel !p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-2 border-b border-pip-border/50">
              <span className="text-xs font-medium text-pip-gold uppercase tracking-wider">{engineId}</span>
              {output.witness_prompt && (
                <span className="text-xs text-pip-text-muted truncate flex-1 text-right italic">
                  &ldquo;{output.witness_prompt.slice(0, 60)}...&rdquo;
                </span>
              )}
            </div>
            <EngineResultRenderer engineId={engineId} result={output} />
          </div>
        ))}
      </div>
    </div>
  );
}
