# Biofield RLS and Storage Design

_Last updated: 2026-03-08_

## Design goals
- keep the Selemene integration additive
- protect user-owned Biofield data consistently
- avoid forcing broad auth/schema rewrites during the first rollout
- introduce storage safely where none existed before

---

## 1. Ownership model

### Primary owner key
For this integration phase, all Biofield records are owned by `public.users.id`.

### Auth expectation
Policies assume the authenticated Supabase user identity matches `public.users.id`, consistent with the existing `public.users` self-read policy already observed in the live project.

### Consequence
All direct table policies use:
- `auth.uid() = user_id`

---

## 2. Table policy model

### Existing Selemene tables hardened in the draft
- `public.user_profiles`
- `public.readings`
- `public.progression_logs`

### New Biofield tables hardened in the draft
- `public.biofield_sessions`
- `public.biofield_snapshots`
- `public.biofield_timeline_points`
- `public.biofield_baselines`
- `public.biofield_artifacts`

### Intended access semantics
- **select**: user can read own records
- **insert**: user can create own records only
- **update**: user can update own records only
- **delete**: allowed only for entities where user cleanup is reasonable in the current design

### Deliberate restraint
The draft does **not** yet introduce more complex team/admin/shared-workspace policies. Those should be layered in later only if product requirements demand them.

---

## 3. Storage model

### Buckets
- `biofield-captures`
- `biofield-reports`

### Bucket intent
- **captures**: original and processed capture images
- **reports**: PDFs, JSON exports, HTML reports

### Path convention
Use path prefixes beginning with the owning user id:
- `{user_id}/{session_id}/{filename}`
- `{user_id}/{snapshot_id}/{filename}`
- `{user_id}/reports/{filename}`

### Why this convention
It allows `storage.objects` policies to enforce access using the first folder segment:
- `(storage.foldername(name))[1] = auth.uid()::text`

---

## 4. Helper migration behavior

The helper/storage migration also adds:
- `updated_at` trigger function
- `updated_at` triggers for mutable Biofield tables
- helper views:
  - `public.biofield_snapshot_detail`
  - `public.biofield_reading_history`

These help support future frontend history and snapshot browsing without embedding heavy join logic in every API route.

---

## 5. Primary rollout risks

### Risk: current live auth mapping differs from expectation
If `auth.uid()` does not actually match `public.users.id` in all active environments, these policies will need an adaptation layer.

### Risk: existing app code relies on unrestricted reads
Enabling RLS on `public.readings` and `public.user_profiles` may surface hidden assumptions in older Selemene or admin paths.

### Risk: storage path discipline is not enforced in clients
If uploads do not use user-id-prefixed paths, object policies will fail even if table writes succeed.

---

## 6. Validation checklist for next wave
- confirm live `auth.uid()` ↔ `public.users.id` alignment in the target environment
- validate bucket creation in a safe project
- run policy tests for authenticated owner access
- run policy tests for cross-user denial
- verify service-role/admin automation expectations before production rollout

---

## 7. Recommendation

Do not enable persistence broadly until:
1. additive schema migration applies cleanly
2. helper/storage migration applies cleanly
3. RLS migration is validated in a safe environment
4. capture/session APIs are exercised end-to-end with a real authenticated user
