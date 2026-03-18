# Phase 0: Foundation & Cleanup

> Establish a clean, well-named, properly structured repo that's ready
> for multi-engine architecture. Fix all naming inconsistencies and
> remove dead code from the single-engine era.

## Context

FMRL was born as "Biofield Mirror" — a single-engine viewer. The repo still
has naming artifacts from that era. Before building multi-engine architecture,
we need a clean foundation: consistent naming, no dead references, and a
project structure that supports the multi-surface platform vision.

## Scope

- Fix "Selene" → "Selemene" naming in docs and code where it refers to the engine
- Keep `engine_id = 'biofield-mirror'` in persistence layer (data contract — DO NOT CHANGE)
- Remove dead deployment docs that reference old infrastructure
- Update README for the FMRL vision
- Establish `.plan/` directory structure (done)
- Verify biofield pipeline still works end-to-end after cleanup

## Architecture Decisions

- `engine_id = 'biofield-mirror'` stays — it's a database discriminator in Selemene's `readings` table
- "Biofield Mirror" in design specs stays — these are historical design documents
- Only rename where "Selene" should be "Selemene" (the engine name)
- `APP_DOMAIN` references should point to `fmrl.tryambakam.space`

## Key Files to Modify

| File | Change |
|------|--------|
| `README.md` | Rewrite for FMRL vision — Selemene frontend platform |
| `docs/selene-biofield/*.md` | Rename "Selene" → "Selemene" where it refers to the engine |
| `docs/design/selemene-integration-spec.md` | Already correct — verify consistency |
| `docs/deployment/fmrl-tryambakam-space.md` | Update any stale domain references |
| `frontend/src-tauri/tauri.conf.json` | Verify app ID is `com.fmrl.app` |

## Wave Structure (at execution time)

### Wave 1: Naming Cleanup (parallelizable)
- **Swarm A (Docs):** Fix Selene → Selemene in all docs/*.md files
- **Swarm B (Code):** Audit code for stale naming, fix domain references

### Wave 2: README & Vision
- **Swarm C (README):** Write new README reflecting FMRL as Selemene frontend platform

### Wave 3: Verification
- **Swarm D (Verify):** Run frontend build, backend startup, confirm nothing broke

## Acceptance Criteria

- [ ] All doc references to "Selene" (meaning the engine) are "Selemene"
- [ ] `engine_id = 'biofield-mirror'` is unchanged in all persistence code
- [ ] README.md describes FMRL as Selemene Engine's unified frontend platform
- [ ] `frontend` builds cleanly (`npm run build`)
- [ ] Tauri app ID is `com.fmrl.app`
- [ ] No references to `biofield.live` domain remain (except historical docs)
- [ ] `.plan/` directory is gitignored or committed as project documentation
- [ ] All changes committed with clean git history

## Anti-Criteria

- [ ] No changes to computation logic (MetricsCalculator, ScoreCalculator, PIPRenderer)
- [ ] No changes to database schema or migrations
- [ ] No changes to API routes or WebSocket protocol
- [ ] `engine_id` values in Python code are NOT renamed

## Estimated Tasks: 10-12
## Dependencies: None — this is the starting phase
