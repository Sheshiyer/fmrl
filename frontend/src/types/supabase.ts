/**
 * Supabase Database Types
 * Based on the Selemene × FMRL integration schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          preferences: Json | null;
          timezone: string | null;
          birth_date: string | null;
          birth_time: string | null;
          birth_location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preferences?: Json | null;
          timezone?: string | null;
          birth_date?: string | null;
          birth_time?: string | null;
          birth_location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          preferences?: Json | null;
          timezone?: string | null;
          birth_date?: string | null;
          birth_time?: string | null;
          birth_location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      readings: {
        Row: {
          id: string;
          user_id: string;
          engine_id: string;
          workflow_id: string;
          input_hash: string;
          input_data: Json;
          result_data: Json;
          witness_prompt: string | null;
          consciousness_level: number | null;
          calculation_time_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          engine_id: string;
          workflow_id: string;
          input_hash: string;
          input_data: Json;
          result_data: Json;
          witness_prompt?: string | null;
          consciousness_level?: number | null;
          calculation_time_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          engine_id?: string;
          workflow_id?: string;
          input_hash?: string;
          input_data?: Json;
          result_data?: Json;
          witness_prompt?: string | null;
          consciousness_level?: number | null;
          calculation_time_ms?: number | null;
          created_at?: string;
        };
      };
      biofield_sessions: {
        Row: {
          id: string;
          user_id: string;
          status: 'idle' | 'active' | 'paused' | 'completed' | 'aborted';
          analysis_mode: string | null;
          analysis_region: string | null;
          source_kind: string | null;
          started_at: string;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
          latest_snapshot_id: string | null;
          summary_reading_id: string | null;
          duration_seconds: number | null;
          timeline_point_count: number | null;
          last_sample_time_ms: number | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: 'idle' | 'active' | 'paused' | 'completed' | 'aborted';
          analysis_mode?: string | null;
          analysis_region?: string | null;
          source_kind?: string | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
          latest_snapshot_id?: string | null;
          summary_reading_id?: string | null;
          duration_seconds?: number | null;
          timeline_point_count?: number | null;
          last_sample_time_ms?: number | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: 'idle' | 'active' | 'paused' | 'completed' | 'aborted';
          analysis_mode?: string | null;
          analysis_region?: string | null;
          source_kind?: string | null;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
          latest_snapshot_id?: string | null;
          summary_reading_id?: string | null;
          duration_seconds?: number | null;
          timeline_point_count?: number | null;
          last_sample_time_ms?: number | null;
          metadata?: Json | null;
        };
      };
      biofield_snapshots: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          reading_id: string | null;
          label: string | null;
          capture_mode: string | null;
          analysis_region: string | null;
          source_kind: string | null;
          original_artifact_id: string | null;
          processed_artifact_id: string | null;
          captured_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          reading_id?: string | null;
          label?: string | null;
          capture_mode?: string | null;
          analysis_region?: string | null;
          source_kind?: string | null;
          original_artifact_id?: string | null;
          processed_artifact_id?: string | null;
          captured_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string | null;
          reading_id?: string | null;
          label?: string | null;
          capture_mode?: string | null;
          analysis_region?: string | null;
          source_kind?: string | null;
          original_artifact_id?: string | null;
          processed_artifact_id?: string | null;
          captured_at?: string;
          created_at?: string;
        };
      };
      biofield_timeline_points: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          sample_index: number;
          sample_time_ms: number;
          score_vector: Json;
          metric_vector: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          sample_index: number;
          sample_time_ms: number;
          score_vector: Json;
          metric_vector: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          sample_index?: number;
          sample_time_ms?: number;
          score_vector?: Json;
          metric_vector?: Json;
          created_at?: string;
        };
      };
      biofield_baselines: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          is_active: boolean;
          source_session_id: string | null;
          source_snapshot_id: string | null;
          source_reading_id: string | null;
          baseline_scores: Json | null;
          baseline_metrics: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string | null;
          is_active?: boolean;
          source_session_id?: string | null;
          source_snapshot_id?: string | null;
          source_reading_id?: string | null;
          baseline_scores?: Json | null;
          baseline_metrics?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string | null;
          is_active?: boolean;
          source_session_id?: string | null;
          source_snapshot_id?: string | null;
          source_reading_id?: string | null;
          baseline_scores?: Json | null;
          baseline_metrics?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      biofield_session_summary: {
        Row: {
          id: string | null;
          user_id: string | null;
          status: string | null;
          started_at: string | null;
          ended_at: string | null;
          duration_seconds: number | null;
          timeline_point_count: number | null;
          latest_snapshot_id: string | null;
          latest_snapshot_captured_at: string | null;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
