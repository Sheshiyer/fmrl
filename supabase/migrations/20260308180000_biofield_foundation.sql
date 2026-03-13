-- Selene × Biofield foundation migration
-- Strategy: additive only, readings-first integration

begin;

-- ------------------------------------------------------------
-- Readings support indexes
-- ------------------------------------------------------------
create index if not exists idx_readings_user_engine_created_at
  on public.readings (user_id, engine_id, created_at desc);

create index if not exists idx_readings_engine_workflow_created_at
  on public.readings (engine_id, workflow_id, created_at desc);

create index if not exists idx_readings_user_created_at
  on public.readings (user_id, created_at desc);

-- ------------------------------------------------------------
-- Biofield sessions
-- ------------------------------------------------------------
create table if not exists public.biofield_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active',
  analysis_mode text not null default 'fullBody',
  analysis_region text not null default 'full',
  source_kind text not null default 'live-estimate',
  summary_reading_id uuid references public.readings(id) on delete set null,
  latest_snapshot_id uuid,
  started_at timestamptz not null default now(),
  paused_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  score_recipe_version text not null default 'v1',
  metric_recipe_version text not null default 'v1',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint biofield_sessions_status_check check (status in ('active', 'paused', 'completed', 'aborted')),
  constraint biofield_sessions_mode_check check (analysis_mode in ('fullBody', 'face', 'segmented')),
  constraint biofield_sessions_region_check check (analysis_region in ('full', 'face', 'body')),
  constraint biofield_sessions_source_kind_check check (source_kind in ('live-estimate', 'backend-detailed', 'python-engine', 'rust-engine')),
  constraint biofield_sessions_duration_check check (duration_seconds is null or duration_seconds >= 0)
);

create index if not exists idx_biofield_sessions_user_started_at
  on public.biofield_sessions (user_id, started_at desc);

create index if not exists idx_biofield_sessions_status_started_at
  on public.biofield_sessions (status, started_at desc);

-- ------------------------------------------------------------
-- Biofield artifacts
-- ------------------------------------------------------------
create table if not exists public.biofield_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  artifact_type text not null,
  storage_bucket text not null,
  storage_path text not null,
  content_type text,
  byte_size bigint,
  linked_session_id uuid references public.biofield_sessions(id) on delete set null,
  linked_snapshot_id uuid,
  linked_reading_id uuid references public.readings(id) on delete set null,
  checksum_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint biofield_artifacts_type_check check (artifact_type in ('capture-original', 'capture-processed', 'report-pdf', 'report-json', 'report-html')),
  constraint biofield_artifacts_size_check check (byte_size is null or byte_size >= 0),
  constraint biofield_artifacts_path_unique unique (storage_bucket, storage_path)
);

create index if not exists idx_biofield_artifacts_user_created_at
  on public.biofield_artifacts (user_id, created_at desc);

create index if not exists idx_biofield_artifacts_session_created_at
  on public.biofield_artifacts (linked_session_id, created_at desc);

-- ------------------------------------------------------------
-- Biofield snapshots
-- ------------------------------------------------------------
create table if not exists public.biofield_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid references public.biofield_sessions(id) on delete set null,
  reading_id uuid references public.readings(id) on delete set null,
  label text,
  capture_mode text not null default 'manual',
  analysis_region text not null default 'full',
  source_kind text not null default 'backend-detailed',
  original_artifact_id uuid references public.biofield_artifacts(id) on delete set null,
  processed_artifact_id uuid references public.biofield_artifacts(id) on delete set null,
  captured_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint biofield_snapshots_capture_mode_check check (capture_mode in ('manual', 'auto', 'baseline-source')),
  constraint biofield_snapshots_region_check check (analysis_region in ('full', 'face', 'body')),
  constraint biofield_snapshots_source_kind_check check (source_kind in ('live-estimate', 'backend-detailed', 'python-engine', 'rust-engine'))
);

create index if not exists idx_biofield_snapshots_user_captured_at
  on public.biofield_snapshots (user_id, captured_at desc);

create index if not exists idx_biofield_snapshots_session_captured_at
  on public.biofield_snapshots (session_id, captured_at desc);

alter table public.biofield_sessions
  add constraint biofield_sessions_latest_snapshot_fkey
  foreign key (latest_snapshot_id) references public.biofield_snapshots(id) on delete set null;

alter table public.biofield_artifacts
  add constraint biofield_artifacts_linked_snapshot_fkey
  foreign key (linked_snapshot_id) references public.biofield_snapshots(id) on delete set null;

-- ------------------------------------------------------------
-- Biofield timeline points
-- ------------------------------------------------------------
create table if not exists public.biofield_timeline_points (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.biofield_sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  sample_index integer not null,
  sample_time_ms integer not null,
  score_vector jsonb not null default '{}'::jsonb,
  metric_vector jsonb not null default '{}'::jsonb,
  source_kind text not null default 'live-estimate',
  score_recipe_version text not null default 'v1',
  metric_recipe_version text not null default 'v1',
  created_at timestamptz not null default now(),
  constraint biofield_timeline_source_kind_check check (source_kind in ('live-estimate', 'backend-detailed', 'python-engine', 'rust-engine')),
  constraint biofield_timeline_sample_index_check check (sample_index >= 0),
  constraint biofield_timeline_sample_time_check check (sample_time_ms >= 0),
  constraint biofield_timeline_points_session_sample_unique unique (session_id, sample_index)
);

create index if not exists idx_biofield_timeline_points_session_time
  on public.biofield_timeline_points (session_id, sample_time_ms asc);

create index if not exists idx_biofield_timeline_points_user_created
  on public.biofield_timeline_points (user_id, created_at desc);

-- ------------------------------------------------------------
-- Biofield baselines
-- ------------------------------------------------------------
create table if not exists public.biofield_baselines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text,
  is_active boolean not null default false,
  source_session_id uuid references public.biofield_sessions(id) on delete set null,
  source_snapshot_id uuid references public.biofield_snapshots(id) on delete set null,
  source_reading_id uuid references public.readings(id) on delete set null,
  baseline_scores jsonb not null default '{}'::jsonb,
  baseline_metrics jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_biofield_baselines_user_created_at
  on public.biofield_baselines (user_id, created_at desc);

create index if not exists idx_biofield_baselines_user_active
  on public.biofield_baselines (user_id, is_active);

-- ------------------------------------------------------------
-- Read model: session summary
-- ------------------------------------------------------------
create or replace view public.biofield_session_summary as
select
  s.id,
  s.user_id,
  s.status,
  s.analysis_mode,
  s.analysis_region,
  s.source_kind,
  s.summary_reading_id,
  s.latest_snapshot_id,
  s.started_at,
  s.ended_at,
  s.duration_seconds,
  s.score_recipe_version,
  s.metric_recipe_version,
  s.created_at,
  s.updated_at,
  coalesce(tp.timeline_point_count, 0) as timeline_point_count,
  max(tp.last_sample_time_ms) as last_sample_time_ms,
  sn.captured_at as latest_snapshot_captured_at
from public.biofield_sessions s
left join (
  select
    session_id,
    count(*)::bigint as timeline_point_count,
    max(sample_time_ms) as last_sample_time_ms
  from public.biofield_timeline_points
  group by session_id
) tp on tp.session_id = s.id
left join public.biofield_snapshots sn on sn.id = s.latest_snapshot_id
group by
  s.id,
  s.user_id,
  s.status,
  s.analysis_mode,
  s.analysis_region,
  s.source_kind,
  s.summary_reading_id,
  s.latest_snapshot_id,
  s.started_at,
  s.ended_at,
  s.duration_seconds,
  s.score_recipe_version,
  s.metric_recipe_version,
  s.created_at,
  s.updated_at,
  tp.timeline_point_count,
  sn.captured_at;

commit;
