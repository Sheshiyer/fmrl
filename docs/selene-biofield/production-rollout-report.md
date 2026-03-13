# Production Rollout Report — Selene × Biofield

_Last updated: 2026-03-08_

## Outcome
A **safe additive subset** of the Biofield persistence rollout was applied successfully to production.

Applied in production:
1. `20260308173000_selene_compat_bootstrap.sql`
2. `20260308180000_biofield_foundation.sql`
3. `20260308183000_biofield_storage_and_helpers.sql`

Deferred in production:
4. `20260308190000_biofield_rls.sql`

## Why RLS was deferred
Production preflight showed:
- `auth.users` count = `0`
- `public.users` count = `31`
- matching ids = `0`

That means the drafted `auth.uid()`-based policy model is unsafe for production as currently written. The identity model must be redesigned around the actual Selene production auth/user architecture before hosted RLS rollout.

## Backups captured before mutation
- schema backup: session data `prod-preflight-schema.sql`
- targeted data backup: session data `prod-preflight-data.sql`

## Production objects now present
- tables:
  - `public.biofield_sessions`
  - `public.biofield_snapshots`
  - `public.biofield_timeline_points`
  - `public.biofield_baselines`
  - `public.biofield_artifacts`
- views:
  - `public.biofield_session_summary`
  - `public.biofield_snapshot_detail`
  - `public.biofield_reading_history`
- storage buckets:
  - `biofield-captures`
  - `biofield-reports`

## Production-backed validation findings
### Confirmed
- production backend health can be made persistence-healthy using the session-pooler connection
- session create / pause / resume / complete work
- timeline batch write/query works
- snapshot create/get works
- baseline create / activate / current works
- session-history and snapshot-history backend surfaces are now validated after fixing a nullable snapshot filter bug

### Issues discovered during production-backed validation
1. **Transaction-pooler asyncpg incompatibility**
   - port `6543` caused duplicate prepared statement failures with asyncpg
   - production-backed validation switched to the session pooler on port `5432`

2. **Snapshot list nullable filter bug**
   - `GET /api/v1/snapshots` initially failed with asyncpg ambiguous parameter typing when `session_id` was null
   - fixed in backend repository by explicitly casting the nullable `session_id` filter

3. **Session latest_snapshot_id linkage gap**
   - snapshot creation initially did not update the parent session’s `latest_snapshot_id`
   - fixed in the snapshot route after validation exposed the gap

4. **Capture route still needs focused follow-up**
   - production-backed capture attempts using arbitrary local sample images caused the validation backend to stall
   - this needs a focused follow-up against real Biofield capture inputs before calling capture persistence fully production-verified

## Recommended next step
Continue with the frontend history tranche using the now-validated session and snapshot surfaces, while separately redesigning hosted RLS around the real Selene identity model.
