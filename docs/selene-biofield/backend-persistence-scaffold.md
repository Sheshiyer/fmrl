# Backend Persistence Scaffold

_Last updated: 2026-03-08_

## Purpose
This scaffold establishes the backend building blocks required to move Biofield Mirror from local/in-memory-only state toward canonical Selene-backed persistence.

It is intentionally designed to be:
- **lazy** — no forced DB connection on app startup
- **non-breaking** — existing analysis routes keep working even if persistence is disabled
- **readings-first** — canonical top-level writes target `public.readings`
- **extensible** — Biofield-specific relational entities are modeled separately

---

## New modules

### Database session layer
- `backend/db/session.py`

Provides:
- lazy async SQLAlchemy engine creation
- async session factory
- transactional session scope helper
- healthcheck method that reports persistence readiness without forcing startup failure

### Canonical persistence models
- `backend/models/persistence.py`

Defines typed create/query payloads for:
- readings
- sessions
- snapshots
- timeline batches
- baselines
- artifacts
- provenance envelopes
- score vectors

### Mapper helpers
- `backend/core/persistence/mappers.py`

Defines helpers for converting current backend analysis outputs into canonical Biofield reading contracts, including:
- provenance creation
- grouped-to-flat metric normalization
- capture-analysis reading payload mapping
- session-summary result mapping

### Repository layer
- `backend/db/repositories/base.py`
- `backend/db/repositories/readings.py`
- `backend/db/repositories/biofield.py`

Provides repository scaffolds for:
- `public.readings`
- `public.biofield_sessions`
- `public.biofield_snapshots`
- `public.biofield_timeline_points`
- `public.biofield_baselines`
- `public.biofield_artifacts`

---

## Non-breaking behavior choices

### 1. Persistence is feature-gated
New config flags in `backend/config.py`:
- `BIOFIELD_PERSISTENCE_ENABLED`
- `DATABASE_ECHO`
- `BIOFIELD_SCORE_RECIPE_VERSION`
- `BIOFIELD_METRIC_RECIPE_VERSION`

By default, persistence is disabled so existing development flows are not forced onto an unavailable database.

### 2. Health endpoint now reports persistence readiness
`/health` now returns a `persistence` object describing whether the DB layer is enabled/healthy.

### 3. Session API scaffold is now present
A new router at `/api/v1/sessions` provides persistence-aware scaffolding for:
- create session
- patch session
- pause session
- resume session
- complete session
- get session
- list sessions

These endpoints are guarded behind `BIOFIELD_PERSISTENCE_ENABLED` so existing development flows remain unaffected until the additive schema is applied.

### 4. Timeline and snapshot APIs are now present
New guarded routers provide:
- `/api/v1/timeline/batch` — write timeline batches
- `/api/v1/timeline/{session_id}` — read timeline points
- `/api/v1/snapshots` — create/list snapshots
- `/api/v1/snapshots/{snapshot_id}` — fetch snapshot detail

### 5. Capture analysis can now persist canonically when enabled
`/api/v1/analysis/capture` now accepts optional persistence context:
- `user_id`
- `session_id`
- `snapshot_id`

When persistence is enabled and a `user_id` is provided, the route builds a canonical reading payload and attempts to create a `public.readings` row.

The response adds additive metadata fields:
- `persisted_reading_id`
- `persistence_state`
- `persistence_error`

### 5. Existing routes still not fully cut over
The scaffold still does **not** yet fully replace:
- baseline route placeholders
- WebSocket persistence behavior
- full history/snapshot/timeline API surfaces

That cutover is the next wave after schema validation.

---

## Recommended next integration points

1. **Wire canonical capture persistence**
   - use `build_capture_reading_create()` in `backend/api/routes/analysis.py`
   - create a `public.readings` row when persistence is enabled

2. **Wire session lifecycle APIs**
   - add create/get/list/update routes using `BiofieldSessionsRepository`

3. **Wire timeline batch writes**
   - add an API surface for buffered timeline samples

4. **Replace baseline placeholders**
   - back `/api/v1/baseline/*` with `BiofieldBaselinesRepository`

5. **Add safe repository smoke tests**
   - validate payload mapping and SQL execution against the additive schema

---

## Validation completed

The backend scaffold was compile-validated with:
- `./.venv/bin/python -m compileall config.py main.py db models core api`

This confirms the new persistence modules import and compile cleanly within the existing backend package.
