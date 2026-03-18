# Local Supabase Validation Notes

_Last updated: 2026-03-08_

## What was added
- `supabase/config.toml` generated via `supabase init --force --yes`
- `supabase/seed.sql` empty stub added so local `supabase db reset` can run cleanly

## Purpose
These files support a **local-safe validation stack** for the drafted Biofield migrations without touching any remote Supabase project.

## Intended workflow
1. `supabase start`
2. `supabase db reset --local --no-seed`
3. inspect resulting tables/views/buckets/policies locally
4. run backend against the local-safe database only after the local reset succeeds

## Important discovery
A plain local Supabase stack starts without the existing Selemene core tables that the Biofield migrations extend.

To keep local validation possible without touching a remote project, a compatibility bootstrap migration was added:
- `20260308173000_selene_compat_bootstrap.sql`

This migration creates minimal core Selemene tables only when they are absent.

## Notes
- This local environment is for migration and API smoke validation only.
- It does not prove remote project auth/user-id mapping by itself.
- Remote-safe validation is still required before broader rollout.
