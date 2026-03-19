/**
 * EngineResultRenderer
 * Dispatches to engine-specific renderers, falling back to GenericResult
 * Engine-specific renderers will be added in Phase 2+3
 */
import type { EngineOutput } from '../../types/selemene';
import { GenericResult } from './GenericResult';
import { PanchangaResult } from './PanchangaResult';
import { VedicClockResult } from './VedicClockResult';
import { BiorhythmResult } from './BiorhythmResult';
import { NumerologyResult } from './NumerologyResult';
import { HumanDesignResult } from './HumanDesignResult';
import { GeneKeysResult } from './GeneKeysResult';

interface EngineResultRendererProps {
  engineId: string;
  result: EngineOutput;
}

// Engine-specific renderers — Phase 2 timing + Phase 3 profile engines
const renderers: Record<string, React.ComponentType<{ result: EngineOutput }>> = {
  'panchanga': PanchangaResult,
  'vedic-clock': VedicClockResult,
  'biorhythm': BiorhythmResult,
  'numerology': NumerologyResult,
  'human-design': HumanDesignResult,
  'gene-keys': GeneKeysResult,
};

export function EngineResultRenderer({ engineId, result }: EngineResultRendererProps) {
  const Renderer = renderers[engineId] ?? GenericResult;
  return <Renderer result={result} />;
}
