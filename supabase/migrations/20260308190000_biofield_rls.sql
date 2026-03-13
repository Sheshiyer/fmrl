-- Selene × Biofield row-level security migration
-- Strategy: additive policies with user-scoped ownership checks

begin;

-- ------------------------------------------------------------
-- Enable RLS on existing Selene tables that will be used directly
-- ------------------------------------------------------------
alter table public.user_profiles enable row level security;
alter table public.readings enable row level security;
alter table public.progression_logs enable row level security;

-- ------------------------------------------------------------
-- Enable RLS on new Biofield tables
-- ------------------------------------------------------------
alter table public.biofield_sessions enable row level security;
alter table public.biofield_snapshots enable row level security;
alter table public.biofield_timeline_points enable row level security;
alter table public.biofield_baselines enable row level security;
alter table public.biofield_artifacts enable row level security;

-- ------------------------------------------------------------
-- public.user_profiles
-- ------------------------------------------------------------
drop policy if exists "User profiles select own" on public.user_profiles;
create policy "User profiles select own"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "User profiles insert own" on public.user_profiles;
create policy "User profiles insert own"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "User profiles update own" on public.user_profiles;
create policy "User profiles update own"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- public.readings
-- ------------------------------------------------------------
drop policy if exists "Readings select own" on public.readings;
create policy "Readings select own"
on public.readings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Readings insert own" on public.readings;
create policy "Readings insert own"
on public.readings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Readings update own" on public.readings;
create policy "Readings update own"
on public.readings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- public.progression_logs
-- ------------------------------------------------------------
drop policy if exists "Progression logs select own" on public.progression_logs;
create policy "Progression logs select own"
on public.progression_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Progression logs insert own" on public.progression_logs;
create policy "Progression logs insert own"
on public.progression_logs
for insert
to authenticated
with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- public.biofield_sessions
-- ------------------------------------------------------------
drop policy if exists "Biofield sessions select own" on public.biofield_sessions;
create policy "Biofield sessions select own"
on public.biofield_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Biofield sessions insert own" on public.biofield_sessions;
create policy "Biofield sessions insert own"
on public.biofield_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Biofield sessions update own" on public.biofield_sessions;
create policy "Biofield sessions update own"
on public.biofield_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Biofield sessions delete own" on public.biofield_sessions;
create policy "Biofield sessions delete own"
on public.biofield_sessions
for delete
to authenticated
using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- public.biofield_snapshots
-- ------------------------------------------------------------
drop policy if exists "Biofield snapshots select own" on public.biofield_snapshots;
create policy "Biofield snapshots select own"
on public.biofield_snapshots
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Biofield snapshots insert own" on public.biofield_snapshots;
create policy "Biofield snapshots insert own"
on public.biofield_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Biofield snapshots update own" on public.biofield_snapshots;
create policy "Biofield snapshots update own"
on public.biofield_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Biofield snapshots delete own" on public.biofield_snapshots;
create policy "Biofield snapshots delete own"
on public.biofield_snapshots
for delete
to authenticated
using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- public.biofield_timeline_points
-- ------------------------------------------------------------
drop policy if exists "Biofield timeline select own" on public.biofield_timeline_points;
create policy "Biofield timeline select own"
on public.biofield_timeline_points
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Biofield timeline insert own" on public.biofield_timeline_points;
create policy "Biofield timeline insert own"
on public.biofield_timeline_points
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Biofield timeline update own" on public.biofield_timeline_points;
create policy "Biofield timeline update own"
on public.biofield_timeline_points
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- public.biofield_baselines
-- ------------------------------------------------------------
drop policy if exists "Biofield baselines select own" on public.biofield_baselines;
create policy "Biofield baselines select own"
on public.biofield_baselines
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Biofield baselines insert own" on public.biofield_baselines;
create policy "Biofield baselines insert own"
on public.biofield_baselines
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Biofield baselines update own" on public.biofield_baselines;
create policy "Biofield baselines update own"
on public.biofield_baselines
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Biofield baselines delete own" on public.biofield_baselines;
create policy "Biofield baselines delete own"
on public.biofield_baselines
for delete
to authenticated
using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- public.biofield_artifacts
-- ------------------------------------------------------------
drop policy if exists "Biofield artifacts select own" on public.biofield_artifacts;
create policy "Biofield artifacts select own"
on public.biofield_artifacts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Biofield artifacts insert own" on public.biofield_artifacts;
create policy "Biofield artifacts insert own"
on public.biofield_artifacts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Biofield artifacts update own" on public.biofield_artifacts;
create policy "Biofield artifacts update own"
on public.biofield_artifacts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Biofield artifacts delete own" on public.biofield_artifacts;
create policy "Biofield artifacts delete own"
on public.biofield_artifacts
for delete
to authenticated
using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Storage object policies for Biofield buckets
-- ------------------------------------------------------------
drop policy if exists "Biofield captures select own" on storage.objects;
create policy "Biofield captures select own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'biofield-captures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Biofield captures insert own" on storage.objects;
create policy "Biofield captures insert own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'biofield-captures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Biofield captures update own" on storage.objects;
create policy "Biofield captures update own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'biofield-captures'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'biofield-captures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Biofield captures delete own" on storage.objects;
create policy "Biofield captures delete own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'biofield-captures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Biofield reports select own" on storage.objects;
create policy "Biofield reports select own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'biofield-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Biofield reports insert own" on storage.objects;
create policy "Biofield reports insert own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'biofield-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Biofield reports update own" on storage.objects;
create policy "Biofield reports update own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'biofield-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'biofield-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Biofield reports delete own" on storage.objects;
create policy "Biofield reports delete own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'biofield-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
