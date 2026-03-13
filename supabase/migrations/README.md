# Migration Notes

## `20260308173000_selene_compat_bootstrap.sql`

This migration is a **local-safe compatibility bootstrap**.

It creates minimal versions of these core Selene tables **only if they are absent**:
- `public.users`
- `public.user_profiles`
- `public.readings`
- `public.progression_logs`

Purpose:
- allow local Supabase validation in an otherwise empty environment
- remain a no-op in real Selene environments where these tables already exist

## `20260308180000_biofield_foundation.sql`

This migration is intentionally **additive** and does not rename or drop existing Selene tables.

### It adds
- support indexes on `public.readings`
- `public.biofield_sessions`
- `public.biofield_artifacts`
- `public.biofield_snapshots`
- `public.biofield_timeline_points`
- `public.biofield_baselines`
- `public.biofield_session_summary` view

### It intentionally does not add yet
- RLS policies
- storage buckets
- triggers for `updated_at`
- data backfills
- compatibility views beyond the first session summary read model

Those are planned in follow-up waves so the rollout remains auditable and reversible.

## `20260308183000_biofield_storage_and_helpers.sql`

This migration adds:
- shared `updated_at` trigger helper
- `updated_at` triggers for mutable Biofield tables
- storage buckets:
  - `biofield-captures`
  - `biofield-reports`
- helper views:
  - `public.biofield_snapshot_detail`
  - `public.biofield_reading_history`

## `20260308190000_biofield_rls.sql`

This migration drafts user-scoped RLS for:
- `public.user_profiles`
- `public.readings`
- `public.progression_logs`
- all new `public.biofield_*` tables
- `storage.objects` entries inside the Biofield buckets

These migrations are drafted in-repo and should be validated in a safe Supabase environment before persistence is enabled broadly.

### Local static preflight
Run:

```bash
python scripts/biofield/validate_migration_stack.py --markdown docs/selene-biofield/migration-static-validation-report.md
```

This verifies ordering, required objects, and obvious destructive-pattern violations before any safe-environment apply step.
