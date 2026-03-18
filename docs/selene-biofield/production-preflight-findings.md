# Production Preflight Findings — Selemene × Biofield

_Last updated: 2026-03-08_

## Production target confirmed
- Project ref: `qjnqdhvlxdmezxdnlrbj`
- Schemas match the previously audited Selemene production shape
- Existing migrations present:
  - `20260208000001`
  - `20260210220000`

## Safety backups captured
- Schema backup: session data `prod-preflight-schema.sql`
- Data backup: session data `prod-preflight-data.sql`

## Critical finding
The drafted RLS migration (`20260308190000_biofield_rls.sql`) currently assumes:
- `auth.uid()` maps to `public.users.id`

Production preflight shows that this assumption is **not currently true**:
- `auth.users` count: `0`
- `public.users` count: `31`
- matching IDs: `0`

## Implication
Applying the drafted owner-scoped RLS policies to existing Selemene tables and new Biofield tables in production would be unsafe, because the identity model needed by those policies does not currently exist in hosted production.

## Safe rollout decision
Proceed only with the **non-breaking additive subset**:
1. `20260308173000_selene_compat_bootstrap.sql` (expected no-op on production)
2. `20260308180000_biofield_foundation.sql`
3. `20260308183000_biofield_storage_and_helpers.sql`

Defer:
4. `20260308190000_biofield_rls.sql`

## Why this is the safest path
- additive tables/views/indexes/buckets can land without changing existing production access behavior
- backend persistence can operate via direct DB connection while the feature flag remains controllable
- RLS can be redesigned later around the actual Selemene identity model rather than the incorrect `auth.uid()` assumption
