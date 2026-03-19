/**
 * Selemene API Types
 * Mirrors the Rust noesis-sdk type definitions
 * See: .plan/phases/PHASE-1-multi-engine.md for API contract
 */

// --- Input Types ---

export interface BirthData {
  name?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  latitude: number;
  longitude: number;
  timezone: string; // IANA format, e.g. "Asia/Kolkata"
}

export interface EngineInput {
  birth_data: BirthData;
  current_time?: string; // ISO 8601 UTC
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number; // meters
  };
  precision?: 'Standard' | 'High' | 'Extreme';
  options?: Record<string, unknown>;
}

// --- Output Types ---

export interface EngineOutputMetadata {
  calculation_time_ms: number;
  backend: string; // "native" | "swiss_ephemeris" | "mock"
  precision_achieved: string;
  cached: boolean;
  timestamp: string; // ISO 8601
  engine_version: string;
}

export interface EngineOutput {
  engine_id: string;
  result: Record<string, unknown>;
  witness_prompt: string;
  consciousness_level: number;
  metadata: EngineOutputMetadata;
  envelope_version: string;
}

export interface ValidationResult {
  valid: boolean;
  confidence: number;
  messages: string[];
}

// --- Workflow Types ---

export interface WorkflowSynthesis {
  key_themes: string[];
  insights: string;
  recommendations: string[];
}

export interface WorkflowResult {
  workflow_id: string;
  engine_outputs: Record<string, EngineOutput>;
  synthesis: WorkflowSynthesis;
  total_time_ms: number;
  timestamp: string;
}

// --- Info Types ---

export interface EngineInfo {
  engine_id: string;
  engine_name: string;
  required_phase: number;
  description?: string;
}

export interface WorkflowInfo {
  workflow_id: string;
  name: string;
  required_phase: number;
  engines: string[];
  description?: string;
}

// --- Reading Types ---

export interface ReadingRecord {
  id: string;
  user_id: string;
  engine_id: string;
  workflow_id?: string | null;
  input_hash: string;
  input_data: EngineInput;
  result_data: EngineOutput;
  witness_prompt?: string | null;
  consciousness_level: number;
  calculation_time_ms: number;
  created_at: string;
}

// --- Auth Types ---

export interface SelemeneAuthResponse {
  access_token: string;
}

// --- Error Types ---

export interface SelemeneError {
  error: string;
  error_code: string;
  details?: Record<string, unknown>;
}

// --- User Types ---

export interface SelemeneUserProfile {
  id: string;
  email: string;
  tier: 'free' | 'premium' | 'enterprise';
  consciousness_level: number;
  created_at: string;
}
