-- Selene compatibility bootstrap for local-safe validation
-- Purpose: allow local Supabase validation in environments where core Selene tables
-- do not already exist. In real Selene environments these statements should be no-ops.

begin;

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  password_hash text,
  full_name text,
  tier text,
  consciousness_level integer,
  experience_points integer not null default 0,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  birth_date date,
  birth_time time,
  birth_location_lat double precision,
  birth_location_lng double precision,
  birth_location_name text,
  timezone text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  engine_id text not null,
  workflow_id text not null,
  input_hash text,
  input_data jsonb not null default '{}'::jsonb,
  result_data jsonb not null default '{}'::jsonb,
  witness_prompt text,
  consciousness_level integer,
  calculation_time_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists public.progression_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action_type text,
  xp_amount integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

commit;
