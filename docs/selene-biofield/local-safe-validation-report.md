# Local-Safe Validation Report — Selemene × Biofield

_Last updated: 2026-03-08_

## Outcome
The drafted Selemene × Biofield migration stack was successfully validated in a **local-safe Supabase environment** and exercised through the guarded backend API layer.

This does **not** replace remote-safe validation against a true Selemene-like environment, but it proves that:
- the migration stack can apply cleanly in order
- the drafted storage buckets and helper views are created
- targeted RLS policies are applied
- the guarded backend persistence flows can execute end-to-end against the resulting schema

---

## Validation environment
- Local Supabase stack started via `supabase start`
- Local database URL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Backend validation instance run on: `http://127.0.0.1:8010`
- Backend flags:
  - `BIOFIELD_PERSISTENCE_ENABLED=true`
  - `DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres`

---

## Migration apply result
Applied locally in order:
1. `20260308173000_selene_compat_bootstrap.sql`
2. `20260308180000_biofield_foundation.sql`
3. `20260308183000_biofield_storage_and_helpers.sql`
4. `20260308190000_biofield_rls.sql`

### Result
- apply status: **PASS**
- helper views created: **PASS**
- buckets created: **PASS**
- targeted public-table RLS enabled: **PASS**
- storage object policies created: **PASS**

---

## Local schema verification snapshot
Confirmed locally:

### Tables
- `public.biofield_sessions`
- `public.biofield_snapshots`
- `public.biofield_timeline_points`
- `public.biofield_baselines`
- `public.biofield_artifacts`

### Views
- `public.biofield_session_summary`
- `public.biofield_snapshot_detail`
- `public.biofield_reading_history`

### Buckets
- `biofield-captures`
- `biofield-reports`

### RLS-enabled tables
- `public.user_profiles`
- `public.readings`
- `public.progression_logs`
- all `public.biofield_*` tables

### Policy counts observed
- `public.user_profiles`: 3
- `public.readings`: 3
- `public.progression_logs`: 2
- `public.biofield_sessions`: 4
- `public.biofield_snapshots`: 4
- `public.biofield_timeline_points`: 3
- `public.biofield_baselines`: 4
- `public.biofield_artifacts`: 4
- `storage.objects`: 8 Biofield-related policies

---

## Guarded backend API smoke result
The guarded local persistence smoke suite completed successfully after iterative bug fixing.

### Verified flows
- health endpoint with persistence readiness
- session create
- capture analysis + canonical reading persistence
- timeline batch write
- timeline query
- snapshot create
- snapshot fetch
- session pause
- session resume
- session complete
- session list
- baseline create
- baseline activate
- baseline current
- reading history query

### Final smoke status
- status: **PASS**
- persisted reading id captured: yes
- history returned persisted items: yes (`total = 3` in final run)

Artifacts written under session data:
- `local-api-smoke/health.json`
- `local-api-smoke/session-create.json`
- `local-api-smoke/capture.json`
- `local-api-smoke/timeline-batch.json`
- `local-api-smoke/timeline-get.json`
- `local-api-smoke/snapshot-create.json`
- `local-api-smoke/snapshot-get.json`
- `local-api-smoke/session-pause.json`
- `local-api-smoke/session-resume.json`
- `local-api-smoke/session-complete.json`
- `local-api-smoke/session-list.json`
- `local-api-smoke/baseline-create.json`
- `local-api-smoke/baseline-activate.json`
- `local-api-smoke/baseline-current.json`
- `local-api-smoke/history.json`
- `local-api-smoke/summary.json`

---

## Important bugs discovered and fixed during validation

### 1. Local stack prerequisite gap
**Issue:** Local Supabase startup failed because the Biofield foundation migration assumed existing Selemene tables (`public.readings`, `public.users`, etc.).

**Fix:** Added `20260308173000_selene_compat_bootstrap.sql`, a no-op compatibility bootstrap for environments where those tables are absent.

### 2. Missing runtime dependency for async SQLAlchemy
**Issue:** The backend compile-validated, but runtime DB calls failed because `greenlet` was not installed in the actual backend venv.

**Fix:** Added `greenlet` to `backend/requirements.txt` and installed it in the project venv used for validation.

### 3. Capture route metric-engine drift
**Issue:** The analysis route called backend metric-engine methods that did not exist (`calculate` vs `calculate_all`) and passed incorrect input shapes for geometric analysis.

**Fix:** Updated `analysis.py` to use the correct public APIs and build a binary image for `GeometricMetrics.calculate_all()`.

### 4. asyncpg nullable-parameter SQL issues
**Issue:** `asyncpg` rejected certain optional query parameters in session updates and history queries due to ambiguous parameter typing.

**Fixes:**
- changed optional JSONB updates to `coalesce(cast(:metadata as jsonb), metadata)`
- explicitly cast optional text filter parameters in reading-history SQL

### 5. Port false-positive risk during health checking
**Issue:** A first backend launch attempt hit port `8000`, which was already occupied, producing a misleading health success against the wrong service.

**Fix:** Moved validation backend to port `8010` and used dedicated logs/PID tracking.

---

## Remaining limits
This report does **not yet** prove:
- real remote `auth.uid()` ↔ `public.users.id` mapping in the Selemene target environment
- compatibility with live remote service-role/admin automation
- true remote-safe apply against the existing Selemene project

Those remain the next verification layer.

---

## Conclusion
The Biofield integration is now materially stronger than before this validation pass:
- schema drafts are locally proven
- guarded APIs are locally proven
- key runtime bugs were surfaced and fixed through actual end-to-end execution

The next best step is **remote-safe validation** against a non-production Selemene-like environment or branch project, using the same migration order and smoke workflow.
