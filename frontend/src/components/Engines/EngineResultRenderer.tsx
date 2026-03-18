/**
 * EngineResultRenderer
 * Dispatches to engine-specific renderers, falling back to GenericResult
 * Engine-specific renderers will be added in Phase 2+3
 */
import type { EngineOutput } from '../../types/selemene';
import { GenericResult } from './GenericResult';

interface EngineResultRendererProps {
  engineId: string;
  result: EngineOutput;
}

// Engine-specific renderers will be added in Phase 2+3
const renderers: Record<string, React.ComponentType<{ result: EngineOutput }>> = {};

export function EngineResultRenderer({ engineId, result }: EngineResultRendererProps) {
  const Renderer = renderers[engineId] ?? GenericResult;
  return <Renderer result={result} />;
}
