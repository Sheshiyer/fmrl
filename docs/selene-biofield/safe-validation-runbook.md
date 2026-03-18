# Safe Validation Runbook — Selemene × Biofield

_Last updated: 2026-03-08_

## Goal
Validate the drafted Biofield schema, storage, and RLS migrations in a **safe Supabase environment** before enabling backend persistence or exposing the new flows broadly.

---

## Scope of this runbook
This runbook validates:
1. migration ordering and additive safety
2. bucket creation
3. helper views and table availability
4. RLS owner access and cross-user denial
5. backend persistence readiness with feature flags
6. guarded API smoke checks for sessions, capture persistence, and baselines

---

## Preconditions
- A safe Supabase project or branch environment exists.
- No production traffic depends on the target environment.
- The drafted SQL migrations in `supabase/migrations/` are the intended validation set.
- A test user exists whose auth identity can be compared against `public.users.id`.
- Backend is runnable locally or in a safe deployment using the target database.

---

## Step 1 — Static preflight (local)
Run the static migration validator first:

```bash
python scripts/biofield/validate_migration_stack.py \
  --markdown docs/selene-biofield/migration-static-validation-report.md
```

Expected result:
- ordering passes
- each drafted migration passes required-pattern checks
- no destructive SQL pattern hits are reported

Artifacts:
- `docs/selene-biofield/migration-static-validation-report.md`

---

## Step 2 — Safe-environment identity check
Before enabling RLS, confirm the live assumption used by policies:
- `auth.uid()` for the authenticated test user matches the intended `public.users.id`

Questions to answer:
- Does one authenticated user map directly to one `public.users.id` row?
- Are there admin/service flows that require broader access than the drafted owner-only policies allow?

If the answer is **no**, stop and adapt the policy model before proceeding.

---

## Step 3 — Apply migrations in order
Apply only in this order:
1. `20260308173000_selene_compat_bootstrap.sql`
2. `20260308180000_biofield_foundation.sql`
3. `20260308183000_biofield_storage_and_helpers.sql`
4. `20260308190000_biofield_rls.sql`

### Note on the compatibility bootstrap
The compatibility bootstrap exists to make **local-safe validation** possible when the local Supabase stack starts from an empty schema. In real Selemene environments it should behave as a no-op because those core tables already exist.

Validation after each apply:
- migration completes successfully
- no pre-existing Selemene table is dropped or altered destructively
- new tables/views/buckets exist as expected

---

## Step 4 — Schema verification checklist
After migration 1:
- `public.biofield_sessions` exists
- `public.biofield_snapshots` exists
- `public.biofield_timeline_points` exists
- `public.biofield_baselines` exists
- `public.biofield_artifacts` exists
- `public.biofield_session_summary` exists
- `public.readings` indexes exist

After migration 2:
- `public.set_current_timestamp_updated_at()` exists
- mutable Biofield tables have `updated_at` triggers
- `storage.buckets` contains:
  - `biofield-captures`
  - `biofield-reports`
- helper views exist:
  - `public.biofield_snapshot_detail`
  - `public.biofield_reading_history`

After migration 3:
- RLS is enabled on all targeted tables
- all drafted policies are present
- storage object policies are present for both Biofield buckets

---

## Step 5 — RLS validation matrix
For each targeted table, validate both:
- **owner access succeeds**
- **cross-user access fails**

### Existing Selemene tables
- `public.user_profiles`
- `public.readings`
- `public.progression_logs`

### New Biofield tables
- `public.biofield_sessions`
- `public.biofield_snapshots`
- `public.biofield_timeline_points`
- `public.biofield_baselines`
- `public.biofield_artifacts`

### Storage
- owner can access own objects under `{user_id}/...`
- owner cannot access another user’s prefix
- invalid path without the leading owner id is denied

Stop immediately if any owner path fails or any cross-user path succeeds.

---

## Step 6 — Backend feature-flag validation
Configure backend with:

```env
BIOFIELD_PERSISTENCE_ENABLED=true
DATABASE_URL=<safe environment database url>
```

Then verify:
- `/health` reports persistence enabled and healthy
- backend starts without import/runtime failures
- session router is reachable
- baseline router uses guarded persistence-aware handlers
- capture route still returns its original payload shape plus additive persistence fields

---

## Step 7 — API smoke sequence
### Session create
Call `POST /api/v1/sessions` with a valid `user_id`.

Expected:
- returns session id
- row appears in `public.biofield_sessions`

### Capture persist
Call `POST /api/v1/analysis/capture` with:
- image
- `user_id`
- `session_id`

Expected:
- analysis succeeds
- `persistence_state` is `persisted`
- `persisted_reading_id` is present
- row appears in `public.readings`

### Baseline create / current / activate
Expected:
- create succeeds
- activate succeeds
- current returns the active baseline for the same user

---

## Step 8 — Rollback readiness
Before broad rollout, verify you can:
- disable `BIOFIELD_PERSISTENCE_ENABLED`
- stop using the new routers without breaking existing analysis behavior
- retain created Biofield rows without affecting older Selemene paths

If a migration rollback is needed, do it in the safe environment first and document exact outcomes.

---

## Success criteria
Validation is successful only if:
- static preflight passes
- identity assumption holds or is adapted safely
- all migrations apply in order
- RLS passes owner/denial checks
- storage paths obey the owner-prefix rule
- backend health reports persistence healthy
- session/capture/baseline smoke flows succeed in the safe environment

---

## Follow-up artifacts to capture
- migration apply logs
- policy verification notes
- backend health output
- API smoke outputs
- any auth mapping deviations discovered during validation
