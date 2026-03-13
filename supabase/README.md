# Supabase Migration Workspace

This directory contains additive migration artifacts for the Selene × Biofield integration program.

## Current strategy
- Preserve existing Selene tables.
- Reuse `public.readings` as the top-level canonical analysis record.
- Add Biofield-specific extension tables for sessions, snapshots, timeline points, baselines, and artifacts.
- Harden RLS in follow-up migrations after relational structure is in place.

## Planned migration order
1. Foundation schema and indexes
2. Constraints and helper view refinements
3. Storage buckets and artifact policy model
4. RLS hardening for existing and new tables
5. Compatibility/read-model helpers

## Notes
- Treat the architecture docs under `docs/selene-biofield/` as the implementation source of truth.
- Do not apply destructive changes without explicit approval and rollback planning.
