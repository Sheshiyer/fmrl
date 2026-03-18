# Live Selemene Supabase Audit

_Last updated: 2026-03-08_

## Executive summary

A read-only audit of the live Selemene Supabase project shows that the platform already has a generic engine/result model centered on `public.readings`, plus user/profile infrastructure in `public.users` and `public.user_profiles`. Biofield Mirror should integrate into this structure **additively**, not by replacing or reshaping existing tables.

---

## 1. Schemas present

Observed non-system schemas:
- `auth`
- `extensions`
- `graphql`
- `graphql_public`
- `public`
- `realtime`
- `storage`
- `supabase_migrations`
- `vault`

This confirms the project is a standard Supabase deployment with app-specific logic concentrated in `public`.

---

## 2. Core public tables relevant to Biofield integration

### `public.users`
Purpose: application-level Selemene user identity.

Key columns:
- `id`
- `email`
- `password_hash`
- `full_name`
- `tier`
- `consciousness_level`
- `experience_points`
- `last_login_at`
- `created_at`
- `updated_at`

### `public.user_profiles`
Purpose: extended user attributes and preferences.

Key columns:
- `user_id`
- `birth_date`
- `birth_time`
- `birth_location_lat`
- `birth_location_lng`
- `birth_location_name`
- `timezone`
- `preferences jsonb`
- `created_at`
- `updated_at`

Relationship:
- `user_profiles.user_id -> public.users.id`

### `public.readings`
Purpose: generic engine/workflow result record.

Key columns:
- `id`
- `user_id`
- `engine_id`
- `workflow_id`
- `input_hash`
- `input_data jsonb`
- `result_data jsonb`
- `witness_prompt`
- `consciousness_level`
- `calculation_time_ms`
- `created_at`

Relationship:
- `readings.user_id -> public.users.id`

### `public.progression_logs`
Purpose: XP/progression logging.

Key columns:
- `id`
- `user_id`
- `action_type`
- `xp_amount`
- `metadata jsonb`
- `created_at`

### `public.api_keys`
Purpose: programmatic identity/permissions/rate-limits.

Key columns:
- `id`
- `key_hash`
- `user_id`
- `tier`
- `permissions jsonb`
- `consciousness_level`
- `rate_limit`
- `expires_at`
- `last_used`
- `is_active`
- `name`
- `key_prefix`

### `public.usage_logs` and monthly partitions
Purpose: usage metering / operational history.

Observed partitions include:
- `usage_logs_2026_01`
- `usage_logs_2026_02`
- ...
- `usage_logs_2026_12`

---

## 3. Current scale snapshot

Estimated live row counts:
- `public.users`: ~31
- `public.user_profiles`: ~3
- `public.readings`: ~233
- `public.api_keys`: ~41
- `public.progression_logs`: ~0
- `public.usage_logs_2026_02`: ~203
- `public.usage_logs_2026_03`: ~88

Implication: this is small but real data, so integration must be non-breaking and rollout-safe.

---

## 4. Storage state

Observed storage bucket count: **0**

Implication:
- There is no existing bucket structure for captures, artifacts, or reports.
- Biofield artifact persistence will need a new storage design.

---

## 5. Existing migration signals

Observed app-level migration names:
- `20260208000001 example_users_table`
- `20260210220000 readings_table`

Implication:
- `public.readings` is already a recognized engine-level primitive in Selemene.
- Biofield should likely extend around `readings`, not bypass it.

---

## 6. Identity model implications

The current application model uses:
- `auth.users` as the Supabase auth layer
- **`public.users` as the app-facing identity layer**

Observed public foreign keys point to `public.users`, not directly to `auth.users`.

Implication:
- For near-term integration, Biofield entities should anchor to **`public.users.id`**.
- Any future auth consolidation should be treated as a separate migration stream, not bundled into the Biofield integration itself.

---

## 7. RLS and security posture

### Current observed state
- `public.users` has RLS enabled
- Existing policy:
  - `Users can read own data`
  - `auth.uid() = id`

### Public tables currently lacking equivalent hardening
- `public.user_profiles`
- `public.readings`
- `public.progression_logs`
- `public.api_keys`
- `public.usage_logs*`

### Implication
Any Biofield rollout that writes into the current schema must include:
- additive RLS hardening
- policy validation
- compatibility testing against existing Selemene flows

---

## 8. Recommended non-breaking integration anchor

The strongest existing anchor for Biofield is:

## `public.readings`

Why:
- already exists
- already stores engine/workflow semantics
- already accepts structured input and result JSONB
- already links to user identity
- already reflects Selemene’s generic compute/result model

### Recommended meaning for Biofield
- one **detailed analysis or canonical reading event** should map to one `public.readings` row
- Biofield-specific entities should extend around it, not replace it

---

## 9. Recommended additive Biofield tables

To avoid overloading `public.readings`, add Biofield-specific extension tables such as:
- `biofield_sessions`
- `biofield_snapshots`
- `biofield_timeline_points`
- `biofield_baselines`
- `biofield_artifacts`

### Suggested roles
- `biofield_sessions` → session lifecycle, ownership, start/end state
- `biofield_snapshots` → user-visible captures linked to readings and artifacts
- `biofield_timeline_points` → high-frequency score/metric history by session
- `biofield_baselines` → baseline source selection and activation
- `biofield_artifacts` → capture image, processed image, PDF/report metadata

---

## 10. Recommended write model

### Canonical reading
Persist one canonical engine event into `public.readings` with:
- `engine_id = 'biofield-mirror'` (or approved Selemene engine naming)
- `workflow_id` for live session, detailed capture, baseline derivation, etc.
- `input_data` for capture mode, region, session metadata, and provenance
- `result_data` for normalized raw metrics, score vector, analysis provenance, and artifact references

### Extension records
Use Biofield-specific tables to model the parts that are relational and query-heavy:
- session state
- timeline samples
- baseline activation
- artifact ownership and listing

---

## 11. Primary risks

- `public.readings` may already have conventions not visible from schema alone; payload compatibility should be sampled before hard cutover.
- RLS is currently incomplete for several app-owned tables.
- Storage is currently absent, so artifact design must be introduced carefully.
- The application identity model currently depends on `public.users`, which should not be reworked casually during Biofield onboarding.

---

## 12. Final conclusion

Selemene already has enough structure to support Biofield Mirror cleanly **without breaking existing tables**.

The safe path is:
1. keep `public.users` and `public.user_profiles` as identity/profile anchors
2. keep `public.readings` as the top-level canonical analysis record
3. add Biofield-specific relational extensions for sessions, snapshots, timelines, baselines, and artifacts
4. harden RLS before broad rollout
5. introduce storage buckets additively for capture/report artifacts
