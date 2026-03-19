import type { EngineOutput, EngineInfo, WorkflowInfo, WorkflowResult } from '../types/selemene';

const baseMeta = {
  calculation_time_ms: 12.5,
  backend: 'native',
  precision_achieved: 'Standard',
  cached: false,
  timestamp: '2026-03-19T10:00:00Z',
  engine_version: '0.1.0',
};

export const mockPanchangaOutput: EngineOutput = {
  engine_id: 'panchanga',
  result: { tithi: 'Shukla Tritiya', nakshatra: 'Ashwini', yoga: 'Vishkambha', karana: 'Bava' },
  witness_prompt: 'What rhythm does today invite you to notice?',
  consciousness_level: 0,
  metadata: { ...baseMeta },
  envelope_version: '1',
};

export const mockNumerologyOutput: EngineOutput = {
  engine_id: 'numerology',
  result: { life_path: 7, destiny: 5, soul_urge: 3, personality: 4, personal_year: 9, personal_month: 3, personal_day: 7 },
  witness_prompt: 'What pattern repeats in your choices this year?',
  consciousness_level: 0,
  metadata: { ...baseMeta },
  envelope_version: '1',
};

export const mockBiorhythmOutput: EngineOutput = {
  engine_id: 'biorhythm',
  result: { physical: 78, emotional: 45, intellectual: 92 },
  witness_prompt: 'Where do you feel most vital right now?',
  consciousness_level: 0,
  metadata: { ...baseMeta },
  envelope_version: '1',
};

export const mockVedicClockOutput: EngineOutput = {
  engine_id: 'vedic-clock',
  result: { ghati: 14, hora: 'Sun', prahara: 2, choghadiya: 'Amrit' },
  witness_prompt: 'What does this hour ask of you?',
  consciousness_level: 0,
  metadata: { ...baseMeta },
  envelope_version: '1',
};

export const mockHumanDesignOutput: EngineOutput = {
  engine_id: 'human-design',
  result: { type: 'Generator', strategy: 'To Respond', authority: 'Sacral', profile: '3/5' },
  witness_prompt: 'What are you waiting to respond to?',
  consciousness_level: 0,
  metadata: { ...baseMeta },
  envelope_version: '1',
};

export const mockGeneKeysOutput: EngineOutput = {
  engine_id: 'gene-keys',
  result: { sequences: {}, keys: {} },
  witness_prompt: 'Which shadow are you contemplating today?',
  consciousness_level: 1,
  metadata: { ...baseMeta },
  envelope_version: '1',
};

export const mockEngineInfoList: EngineInfo[] = [
  { engine_id: 'panchanga', engine_name: 'Panchanga', required_phase: 0 },
  { engine_id: 'vedic-clock', engine_name: 'Vedic Clock', required_phase: 0 },
  { engine_id: 'biorhythm', engine_name: 'Biorhythm', required_phase: 0 },
  { engine_id: 'numerology', engine_name: 'Numerology', required_phase: 0 },
  { engine_id: 'human-design', engine_name: 'Human Design', required_phase: 0 },
  { engine_id: 'gene-keys', engine_name: 'Gene Keys', required_phase: 1 },
];

export const mockWorkflowInfoList: WorkflowInfo[] = [
  { workflow_id: 'birth-blueprint', name: 'Birth Blueprint', required_phase: 0, engines: ['numerology', 'human-design', 'vimshottari'] },
  { workflow_id: 'daily-practice', name: 'Daily Practice', required_phase: 0, engines: ['panchanga', 'vedic-clock', 'biorhythm'] },
];

export const mockWorkflowResult: WorkflowResult = {
  workflow_id: 'birth-blueprint',
  engine_outputs: {
    'numerology': mockNumerologyOutput,
    'human-design': mockHumanDesignOutput,
  },
  synthesis: {
    key_themes: ['identity', 'life_purpose'],
    insights: 'Your numerology and human design point toward a path of deep inquiry.',
    recommendations: ['Spend time in reflection today', 'Follow your sacral response'],
  },
  total_time_ms: 280.5,
  timestamp: '2026-03-19T10:00:00Z',
};
