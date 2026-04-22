# API Integration Debug Playbook (Frontend ↔ Supabase ↔ Selemene)

## 1) Architecture map (what talks to what)

- Frontend auth + profile source of truth:
  - `frontend/src/context/auth/AuthContext.tsx`
- Frontend birth data sync bridge:
  - `frontend/src/context/AppContext.tsx`
- Frontend Selemene engine client:
  - `frontend/src/services/SelemeneClient.ts`
- Frontend Selemene auth bridge (token bootstrap):
  - `frontend/src/services/SelemeneAuthBridge.ts`
- Frontend timing engine hook (Panchanga/Vedic/Biorhythm/Numerology):
  - `frontend/src/hooks/useTodayEngines.ts`
- Local backend profile settings API (settings/preferences sync only):
  - `backend/api/routes/profile.py`
  - `backend/db/repositories/profiles.py`

## 2) Readings and engines data flow

### Engine calculations (Selemene API)
1. User signs in via Supabase.
2. `AuthContext` bridges to Selemene (`connectSelemene`) and stores `fmrl_selemene_token`.
3. UI hooks call `SelemeneClient.calculate(engineId, input)` with `Authorization: Bearer <jwt>` for bridge-authenticated user sessions.
4. If a manual `nk_...` API key is supplied for external/integration testing, the same client falls back to `X-API-Key`.
5. Dashboard `useTodayEngines` requests:
   - `panchanga`
   - `vedic-clock`
   - `biorhythm`
   - `numerology`

### Readings
- Selemene readings are fetched via:
  - `SelemeneClient.listReadings()`
  - `SelemeneClient.getReading(readingId)`
- Biofield local backend persistence path stores canonical reading/session/snapshot references in Supabase-backed tables under `public.*` and `biofield_*` tables.

## 3) Birth date persistence flow (critical)

When birth data is edited:
1. `AppContext.setBirthData()` updates in-memory app state.
2. It writes local fallback to `localStorage['fmrl_birth_data']`.
3. It calls `updateProfile()` in `AuthContext` to write:
   - `birth_date`
   - `birth_time`
   - `birth_location`
   - `timezone`
4. On app load/login, profile is fetched and can hydrate local birth state.

## 4) Root causes found and fixed

### A) Birthday looked saved but did not persist/reload from Supabase
Root cause:
- Profile fetch/create logic supported a resolved DB user id (`public.users.id`) that can differ from `auth.users.id`.
- But `refreshProfile()` and `updateProfile()` used only `user.id`.
- Result: writes/reads could target the wrong `user_profiles.user_id`, causing stale reloads.

Fix applied:
- `AuthContext` now uses `dbUser?.id ?? user?.id` consistently for `refreshProfile()` and `updateProfile()`.

### B) Panchanga failed with no visible error
Root cause:
- `useTodayEngines` used `Promise.allSettled` and only surfaced `error` if all engines failed.
- If only Panchanga failed, UI could silently show stale/empty Panchanga without an error message.

Fix applied:
- `useTodayEngines` now surfaces a Panchanga-specific error when Panchanga fails, even if other engines succeed.
- Added console warning with explicit Panchanga failure message.

## 5) Validation checklist to run during integration

### Supabase profile write/read
1. Log in with a known user.
2. Edit birth date/time/location.
3. Confirm network request to Supabase `user_profiles` update succeeds.
4. Relaunch app.
5. Confirm birth values reload from Supabase and match edited values.

### Selemene token + engines
1. Confirm `fmrl_selemene_token` exists in local storage after auth bridge.
2. Verify `/api/v1/engines` returns data with `Authorization: Bearer <jwt>` for signed-in app sessions.
3. Verify `/api/v1/engines/panchanga/calculate` payload includes valid `birth_data` and timezone.
4. Confirm Panchanga card updates or shows explicit failure text.

## 6) Useful commands

From `frontend/`:

```bash
npm exec vitest run src/__tests__/hooks/useTodayEngines.test.ts
```

## 7) Next hardening suggestions

1. Add an integration test for `AuthContext` ensuring profile updates target resolved DB user id when it differs from auth id.
2. Add structured per-engine error state (not just a single `error`) so UI can show engine-specific badges.
3. Add a "Force refresh from cloud" action for birth data/profile to avoid local-storage ambiguity during debugging.
