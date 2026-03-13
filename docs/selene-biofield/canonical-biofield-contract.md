# Canonical Biofield Contract (Readings-First)

_Last updated: 2026-03-08_

## Architecture decision

### Decision
Use **Selene `public.readings` as the canonical top-level Biofield analysis record**, and add Biofield-specific extension tables for sessions, snapshots, timeline points, baselines, and artifacts.

### Why
- `public.readings` already exists as a generic engine/workflow result model.
- It already anchors to the Selene user layer (`public.users`).
- It already supports flexible JSONB payloads via `input_data` and `result_data`.
- Reusing it minimizes breakage and aligns Biofield with Selene’s existing engine architecture.

### Consequence
Biofield-specific relational detail should **extend around readings**, not replace it.

---

## 1. Canonical identity model

### User anchor
Use `public.users.id` as the immediate application-level owner for new Biofield entities.

### Profile anchor
Use `public.user_profiles` for:
- user timezone
- app/profile preferences
- future Biofield-specific preference keys inside `preferences jsonb` unless normalization is later approved

---

## 2. Canonical entities

## A. Reading (top-level canonical analysis event)
Backed by `public.readings`.

### Required semantics
Each Biofield reading should represent one canonical analysis output, typically from:
- a detailed capture
- a finalized session summary
- a baseline derivation event
- other approved workflow outputs

### Required fields
- `engine_id`
- `workflow_id`
- `input_hash`
- `input_data`
- `result_data`
- `calculation_time_ms`
- `created_at`

### Biofield engine conventions
Suggested values:
- `engine_id = 'biofield-mirror'`
- `workflow_id` examples:
  - `live-session-summary`
  - `capture-detailed-analysis`
  - `baseline-derivation`
  - `report-export`

---

## B. Biofield session
### Purpose
Represents the lifecycle of a live dashboard session.

### Suggested fields
- `id`
- `user_id`
- `status` (`active`, `paused`, `completed`, `aborted`)
- `analysis_mode`
- `analysis_region`
- `started_at`
- `ended_at`
- `duration_seconds`
- `active_reading_id` or `summary_reading_id` (nullable)
- `metadata jsonb`

### Notes
This should model session lifecycle explicitly rather than overloading `public.readings`.

---

## C. Biofield snapshot
### Purpose
Represents a user-visible capture event.

### Suggested fields
- `id`
- `user_id`
- `session_id`
- `reading_id`
- `label`
- `captured_at`
- `capture_mode`
- `analysis_region`
- `provenance`
- `artifact_id` or grouped artifact references
- `metadata jsonb`

### Notes
A snapshot is the user-facing record that should reopen the detailed analysis view later.

---

## D. Biofield timeline point
### Purpose
Represents one persisted sample in the session timeline.

### Suggested fields
- `id`
- `session_id`
- `sample_index`
- `sample_time_seconds`
- `score_vector jsonb`
- `metric_vector jsonb`
- `source_kind` (`live-estimate`, `backend-detailed`, future parity mode)
- `recipe_version`
- `created_at`

### Notes
Timeline points should be append-only within a session and queryable in time order.

---

## E. Biofield baseline
### Purpose
Represents a user-chosen reference state used for comparison.

### Suggested fields
- `id`
- `user_id`
- `source_session_id`
- `source_snapshot_id`
- `source_reading_id`
- `name`
- `is_active`
- `baseline_metrics jsonb`
- `baseline_scores jsonb`
- `created_at`
- `updated_at`

---

## F. Biofield artifact
### Purpose
Tracks storage-backed files.

### Suggested fields
- `id`
- `user_id`
- `artifact_type` (`capture-original`, `capture-processed`, `report-pdf`, `report-json`)
- `storage_bucket`
- `storage_path`
- `content_type`
- `byte_size`
- `linked_session_id`
- `linked_snapshot_id`
- `linked_reading_id`
- `created_at`

---

## 3. Canonical score vector

Every persisted Biofield score vector should contain:
- `energy`
- `symmetry`
- `coherence`
- `complexity`
- `regulation`
- `colorBalance`

### Required provenance fields
- `engine_id`
- `workflow_id`
- `source_kind`
- `analysis_mode`
- `analysis_region`
- `score_recipe_version`
- `metric_recipe_version`
- `computed_at`

---

## 4. Canonical raw metric vector

The canonical raw metric payload should support both live and detailed paths.

### Core metrics
- `lqd`
- `avgIntensity`
- `innerNoise`
- `fractalDim`
- `hurstExp`
- `horizontalSymmetry`
- `verticalSymmetry`

### Extended metric groups
- basic metrics
- color metrics
- geometric metrics
- contour metrics
- nonlinear metrics
- symmetry metrics

### Required contract rules
- all metric fields must define units or expected ranges
- nullable advanced fields must be allowed when a path cannot produce them
- metrics must carry provenance to distinguish estimate vs detailed output

---

## 5. Provenance contract

Every persisted Biofield record should answer:
- **who** owns it
- **when** it was captured/computed
- **which engine** produced it
- **which workflow** produced it
- **which mode/region** it used
- **whether it is live-estimated or backend-detailed**
- **which recipe version** produced the values

### Suggested provenance fields
- `source_kind`
- `engine_id`
- `workflow_id`
- `analysis_mode`
- `analysis_region`
- `score_recipe_version`
- `metric_recipe_version`
- `app_version`
- `runtime_route` (`frontend`, `python`, future `rust`)

---

## 6. What belongs in `public.readings` JSONB vs extension tables

## Keep in `public.readings.input_data`
- capture context
- workflow parameters
- stage mode / region
- session context summary
- input hash source fields
- provenance envelope

## Keep in `public.readings.result_data`
- canonical score vector
- canonical raw metric vector
- grouped detailed metric payloads
- comparison payloads
- artifact references

## Normalize into extension tables when query-heavy
- session lifecycle state
- timeline samples
- snapshot listing and reopening
- baseline activation
- artifact cataloging

---

## 7. Security rules

### Required baseline rule
All user-owned Biofield records must resolve ownership through `public.users.id`.

### Required policy rule
If a table contains user-owned Biofield data, it must have explicit RLS and policy coverage before broad rollout.

### Priority tables for hardening
- `public.user_profiles`
- `public.readings`
- `biofield_sessions`
- `biofield_snapshots`
- `biofield_timeline_points`
- `biofield_baselines`
- `biofield_artifacts`

---

## 8. Rollout rule

The first release should prioritize:
- additive schema only
- feature-flagged client rollout
- provenance-safe writes
- compatibility with existing Selene reading flows
- explicit verification over broad enablement

---

## 9. Definition of success

This contract is successful when:
- one user can start a session,
- persist timeline points,
- create a snapshot,
- reopen detailed analysis later,
- create a baseline,
- export a report,
- and every persisted record can be explained by ownership, provenance, and stable IDs.
