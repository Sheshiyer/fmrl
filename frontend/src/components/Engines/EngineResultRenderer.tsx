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
import { VimshottariResult } from './VimshottariResult';
import { TarotResult } from './TarotResult';
import { EnneagramResult } from './EnneagramResult';
import { SigilForgeResult } from './SigilForgeResult';
import { SacredGeometryResult } from './SacredGeometryResult';
import { IChingResult } from './IChingResult';

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
  'vimshottari': VimshottariResult,
  'tarot': TarotResult,
  'enneagram': EnneagramResult,
  'sigil-forge': SigilForgeResult,
  'sacred-geometry': SacredGeometryResult,
  'i-ching': IChingResult,
};

export function EngineResultRenderer({ engineId, result }: EngineResultRendererProps) {
  const Renderer = renderers[engineId] ?? GenericResult;
  return <Renderer result={result} />;
}
