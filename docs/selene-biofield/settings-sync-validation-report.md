# Settings Sync Validation Report — Biofield Mirror

_Last updated: 2026-03-08_

## Outcome
Backend-mediated settings sync is now implemented for the stable synced subset of the Settings surface.

## Synced domains
- `appearance`
- `capture`

## Local-only domain
- `runtime`

## Backend API
- `GET /api/v1/profile/settings?user_id=<uuid>`
- `PATCH /api/v1/profile/settings`

These endpoints read/write the managed namespaces in:
- `public.user_profiles.preferences`

They preserve unrelated preference keys instead of overwriting the full JSON payload.

## Production-backed validation performed
Validation ran against a local backend process connected to the production database through the session pooler.

### Case 1 — existing profile row
Validated for an existing `public.user_profiles` row:
- fetch current synced settings
- patch appearance + capture namespaces
- re-fetch and confirm values
- confirm production row still exists

### Case 2 — missing profile row
Validated for a production user with no `public.user_profiles` row:
- fetch returns `profile_exists = false`
- patch creates a minimal profile row with preferences
- re-fetch returns `profile_exists = true`
- synced settings values are returned correctly

## Restoration safety
After validation:
- the missing-profile test row was deleted/restored to its original absence
- the existing-profile row was restored to its original preferences and original `updated_at`

## Key implementation notes
- Settings sync is **backend-mediated**, not direct client-to-Supabase.
- The frontend still loads local defaults first and remains resilient if sync fails.
- Runtime toggles remain local to avoid surprising cross-device behavior.

## Validation artifact
Detailed validation output:
- session data `settings-sync-validation/validation-report.json`
