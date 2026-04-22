import type { EngineInfo, WorkflowInfo } from '../types/selemene';

/** Last-resort API key when Discord OAuth doesn't provide a Selemene token. */
export const FALLBACK_SELEMENE_API_KEY = 'nk_8196ea03460f48a9b9833224826f05bf5867c0dbbae94e588cc684c835c4cfd7';

export const FALLBACK_SELEMENE_ENGINES: EngineInfo[] = [
  {
    engine_id: 'panchanga',
    engine_name: 'Panchanga',
    required_phase: 0,
    description: 'Vedic calendar snapshot of tithi, nakshatra, yoga, and karana.',
  },
  {
    engine_id: 'vedic-clock',
    engine_name: 'Vedic Clock',
    required_phase: 0,
    description: 'Live hora and ghati timing window for the current moment.',
  },
  {
    engine_id: 'biorhythm',
    engine_name: 'Biorhythm',
    required_phase: 0,
    description: 'Physical, emotional, and intellectual cycle tracking.',
  },
  {
    engine_id: 'numerology',
    engine_name: 'Numerology',
    required_phase: 0,
    description: 'Personal-day and life-path patterns from birth data.',
  },
  {
    engine_id: 'human-design',
    engine_name: 'Human Design',
    required_phase: 0,
    description: 'BodyGraph, type, strategy, authority, and profile.',
  },
  {
    engine_id: 'gene-keys',
    engine_name: 'Gene Keys',
    required_phase: 1,
    description: 'Hologenetic profile and contemplation sequences.',
  },
  {
    engine_id: 'vimshottari',
    engine_name: 'Vimshottari',
    required_phase: 0,
    description: 'Planetary dasha periods and longer-term timing cycles.',
  },
  {
    engine_id: 'tarot',
    engine_name: 'Tarot',
    required_phase: 1,
    description: 'Archetypal card spreads for reflective inquiry.',
  },
  {
    engine_id: 'i-ching',
    engine_name: 'I Ching',
    required_phase: 1,
    description: 'Hexagram-based guidance for change and decision-making.',
  },
  {
    engine_id: 'enneagram',
    engine_name: 'Enneagram',
    required_phase: 2,
    description: 'Pattern and growth-line mapping for self-observation.',
  },
  {
    engine_id: 'sigil-forge',
    engine_name: 'Sigil Forge',
    required_phase: 1,
    description: 'Generative symbolic forms for intention and focus.',
  },
  {
    engine_id: 'sacred-geometry',
    engine_name: 'Sacred Geometry',
    required_phase: 1,
    description: 'Pattern-based geometric mirrors for contemplation.',
  },
];

export const FALLBACK_SELEMENE_WORKFLOWS: WorkflowInfo[] = [
  {
    workflow_id: 'birth-blueprint',
    name: 'Birth Blueprint',
    required_phase: 0,
    engines: ['numerology', 'human-design', 'vimshottari'],
    description: 'Core identity mapping through numerology, human design, and vimshottari.',
  },
  {
    workflow_id: 'daily-practice',
    name: 'Daily Practice',
    required_phase: 0,
    engines: ['panchanga', 'vedic-clock', 'biorhythm'],
    description: 'Daily rhythm optimization with panchanga, vedic clock, and biorhythm.',
  },
  {
    workflow_id: 'decision-support',
    name: 'Decision Support',
    required_phase: 1,
    engines: ['tarot', 'i-ching', 'human-design'],
    description: 'Multi-perspective decision making with tarot, I Ching, and human design.',
  },
  {
    workflow_id: 'self-inquiry',
    name: 'Self Inquiry',
    required_phase: 2,
    engines: ['gene-keys', 'enneagram'],
    description: 'Shadow work and pattern exploration with gene keys and enneagram.',
  },
  {
    workflow_id: 'creative-expression',
    name: 'Creative Expression',
    required_phase: 1,
    engines: ['sigil-forge', 'sacred-geometry'],
    description: 'Generative aesthetic guidance with sigil forge and sacred geometry.',
  },
  {
    workflow_id: 'full-spectrum',
    name: 'Full Spectrum',
    required_phase: 3,
    engines: FALLBACK_SELEMENE_ENGINES.map((engine) => engine.engine_id),
    description: 'Complete consciousness toolkit across every currently integrated engine.',
  },
];

export function findFallbackWorkflow(workflowId: string | undefined) {
  if (!workflowId) return null;
  return FALLBACK_SELEMENE_WORKFLOWS.find((workflow) => workflow.workflow_id === workflowId) ?? null;
}
