/**
 * GenericResult Component
 * Renders any EngineOutput in a readable, structured format
 * Used as the default renderer when no engine-specific renderer exists
 */
import { Clock, Cpu, Database, Sparkles } from 'lucide-react';
import type { EngineOutput } from '../../types/selemene';

interface GenericResultProps {
  result: EngineOutput;
}

function renderValue(value: unknown, depth: number): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-pip-text-muted italic">none</span>;
  }

  if (typeof value === 'boolean') {
    return <span className={value ? 'text-pip-emerald' : 'text-pip-warning'}>{String(value)}</span>;
  }

  if (typeof value === 'number') {
    return <span className="text-pip-gold">{value}</span>;
  }

  if (typeof value === 'string') {
    return <span className="text-pip-text-secondary">{value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-pip-text-muted italic">empty</span>;
    }
    return (
      <div className="flex flex-col gap-1 pl-3 border-l border-pip-border/30">
        {value.map((item, i) => (
          <div key={i} className="text-sm">
            {renderValue(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object' && depth < 2) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="text-pip-text-muted italic">empty</span>;
    }
    return (
      <div className="flex flex-col gap-1.5 pl-3 border-l border-pip-border/30">
        {entries.map(([k, v]) => (
          <div key={k} className="text-sm">
            <span className="text-pip-text-muted mr-2">{k}:</span>
            {renderValue(v, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  // Beyond max depth, stringify
  return <span className="text-pip-text-muted text-xs">{JSON.stringify(value)}</span>;
}

export function GenericResult({ result }: GenericResultProps) {
  if (!result) {
    return (
      <div className="mystic-panel !p-6 text-center text-pip-text-muted">
        No result data available.
      </div>
    );
  }

  const resultEntries = Object.entries(result.result ?? {});

  return (
    <div className="flex flex-col gap-4">
      {/* Witness Prompt */}
      {result.witness_prompt && (
        <div className="mystic-panel !p-5">
          <p className="text-lg italic text-pip-gold leading-relaxed">
            "{result.witness_prompt}"
          </p>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs border border-pip-border/50 bg-black/20 text-pip-text-secondary">
          {result.engine_id}
        </span>
        <span className="px-3 py-1 rounded-full text-xs border border-pip-gold/30 bg-pip-gold/10 text-pip-gold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Level {result.consciousness_level}
        </span>
      </div>

      {/* Result Data */}
      {resultEntries.length > 0 && (
        <div className="mystic-panel !p-4 flex flex-col gap-3">
          <div className="mystic-eyebrow text-xs">Result Data</div>
          <div className="flex flex-col gap-2">
            {resultEntries.map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-sm font-medium text-pip-text-primary">{key}</span>
                <div className="text-sm">{renderValue(value, 0)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      {result.metadata && (
        <div className="mystic-panel !p-4">
          <div className="mystic-eyebrow text-xs mb-3">Metadata</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2 text-pip-text-secondary">
              <Clock className="w-3.5 h-3.5 text-pip-text-muted" />
              <span>{result.metadata.calculation_time_ms}ms</span>
            </div>
            <div className="flex items-center gap-2 text-pip-text-secondary">
              <Cpu className="w-3.5 h-3.5 text-pip-text-muted" />
              <span>{result.metadata.backend}</span>
            </div>
            <div className="flex items-center gap-2 text-pip-text-secondary">
              <Database className="w-3.5 h-3.5 text-pip-text-muted" />
              <span>{result.metadata.cached ? 'Cached' : 'Fresh'}</span>
            </div>
            <div className="text-pip-text-muted text-xs">
              {new Date(result.metadata.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
