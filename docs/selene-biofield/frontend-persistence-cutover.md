# Frontend Persistence Cutover Scaffold

_Last updated: 2026-03-08_

## Purpose
This scaffold begins the transition from purely local/in-memory frontend flows toward the canonical Selemene × Biofield persistence layer.

It is intentionally:
- **best-effort** — local preview behavior still works if persistence is unavailable
- **feature-sensitive** — it only arms persistence when backend health reports it enabled/healthy and a user UUID is configured
- **non-breaking** — capture still produces a local preview image and the analysis page still works without persisted identifiers

---

## What was added

### 1. Frontend persistence client
- `frontend/src/services/BiofieldPersistenceService.ts`

Provides wrappers for:
- backend health / persistence status
- session create/pause/resume/complete/list
- timeline batch writes
- snapshot create
- analysis history list
- baseline current lookup
- configured user UUID storage in localStorage / env

### 2. Frontend persistence hook
- `frontend/src/hooks/useBiofieldPersistence.ts`

Provides app-facing state and actions for:
- persistence readiness
- configured Selemene user UUID
- session bootstrap
- timeline flushing
- persisted capture/snapshot recording
- history refresh
- baseline refresh
- session lifecycle pause/resume/complete

### 3. Stage panel cutover
- `frontend/src/components/Panels/PIPCanvasPanel.tsx`
- `frontend/src/components/PIPCanvas/PIPShader.tsx`
- `frontend/src/hooks/useFrameCapture.ts`

Changes:
- stage capture still grabs a local image preview
- stage now also performs a best-effort backend capture call
- user/session context is sent when persistence is armed
- shader handle now exposes the canvas so the backend capture hook can operate directly

### 4. App integration
- `frontend/src/App.tsx`

Changes:
- session bootstrap when entering dashboard
- timeline flush attempts as new points accumulate
- capture result now records persisted reading/snapshot IDs when available
- completed captures refresh history and baseline state
- stage pause/resume toggles now call persisted session lifecycle handlers

### 5. Account cutover surface
- `frontend/src/pages/AccountPage.tsx`

The Account page now shows:
- configured Selemene user UUID
- backend persistence enabled/healthy state
- active session ID / status
- last reading ID / snapshot ID
- current baseline name
- refresh controls

This is not full profile integration yet, but it is now a practical persistence-control surface.

---

## Current limitations
- No true Supabase auth/user bootstrap exists on the frontend yet.
- The configured user UUID is currently a local setting, not a logged-in Selemene identity.
- The analysis page displays persisted IDs in data only; richer persisted-history navigation is still ahead.
- The cutover is compile-validated but not yet fully exercised through the desktop frontend against a hosted non-production backend.

---

## Validation completed
- frontend build passes via `npm run build`
- backend local-safe validation already proved the target APIs behind this scaffold

## Recommended next frontend steps
1. true Selemene auth/session bootstrap
2. account/profile fetch/update route integration
3. persisted history browser surfaces for sessions and snapshots
4. baseline comparison UI wired to live persisted state
5. richer Detailed Analysis provenance/persistence display
