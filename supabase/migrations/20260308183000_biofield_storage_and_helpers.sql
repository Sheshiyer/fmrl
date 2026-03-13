-- Selene × Biofield storage and helper migration
-- Strategy: additive helpers only; no destructive changes

begin;

-- ------------------------------------------------------------
-- Shared updated_at trigger helper
-- ------------------------------------------------------------
create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Updated-at triggers for Biofield tables
-- ------------------------------------------------------------
drop trigger if exists set_biofield_sessions_updated_at on public.biofield_sessions;
create trigger set_biofield_sessions_updated_at
before update on public.biofield_sessions
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_biofield_artifacts_updated_at on public.biofield_artifacts;
create trigger set_biofield_artifacts_updated_at
before update on public.biofield_artifacts
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_biofield_snapshots_updated_at on public.biofield_snapshots;
create trigger set_biofield_snapshots_updated_at
before update on public.biofield_snapshots
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_biofield_baselines_updated_at on public.biofield_baselines;
create trigger set_biofield_baselines_updated_at
before update on public.biofield_baselines
for each row execute function public.set_current_timestamp_updated_at();

-- ------------------------------------------------------------
-- Storage buckets
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'biofield-captures',
  'biofield-captures',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'biofield-reports',
  'biofield-reports',
  false,
  26214400,
  array['application/pdf', 'application/json', 'text/html']
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Helper read models
-- ------------------------------------------------------------
create or replace view public.biofield_snapshot_detail as
select
  sn.id,
  sn.user_id,
  sn.session_id,
  sn.reading_id,
  sn.label,
  sn.capture_mode,
  sn.analysis_region,
  sn.source_kind,
  sn.original_artifact_id,
  sn.processed_artifact_id,
  sn.captured_at,
  sn.metadata,
  sn.created_at,
  sn.updated_at,
  s.status as session_status,
  s.started_at as session_started_at,
  s.ended_at as session_ended_at,
  r.engine_id,
  r.workflow_id,
  r.result_data,
  r.created_at as reading_created_at,
  original_artifact.storage_bucket as original_storage_bucket,
  original_artifact.storage_path as original_storage_path,
  processed_artifact.storage_bucket as processed_storage_bucket,
  processed_artifact.storage_path as processed_storage_path
from public.biofield_snapshots sn
left join public.biofield_sessions s on s.id = sn.session_id
left join public.readings r on r.id = sn.reading_id
left join public.biofield_artifacts original_artifact on original_artifact.id = sn.original_artifact_id
left join public.biofield_artifacts processed_artifact on processed_artifact.id = sn.processed_artifact_id;

create or replace view public.biofield_reading_history as
select
  r.id,
  r.user_id,
  r.engine_id,
  r.workflow_id,
  r.input_hash,
  r.input_data,
  r.result_data,
  r.consciousness_level,
  r.calculation_time_ms,
  r.created_at,
  s.id as session_id,
  s.status as session_status,
  sn.id as snapshot_id,
  sn.label as snapshot_label,
  sn.captured_at as snapshot_captured_at
from public.readings r
left join public.biofield_sessions s on s.summary_reading_id = r.id
left join public.biofield_snapshots sn on sn.reading_id = r.id
where r.engine_id = 'biofield-mirror';

commit;
