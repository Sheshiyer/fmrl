# FMRL Master Plan — Selemene Engine Frontend Platform

> Transform FMRL from a single-engine biofield viewer into the unified frontend
> platform for all 16 Selemene consciousness engines, across desktop, watchOS, and widgets.

## Discovery Summary

| Parameter | Value |
|-----------|-------|
| Planning depth | Deeply detailed |
| Delivery mode | Phased rollout |
| Backend strategy | Hybrid — Python for local biofield compute, Selemene API for 15 other engines |
| Engine priority | Wave 1: Panchanga + Vedic Clock, Numerology + Biorhythm / Wave 2: Human Design + Gene Keys |
| Team topology | Solo + parallel AI agents |
| Release model | 7 phases, each independently shippable |
| Quality bar | Production for shipped phases, prototype-quality acceptable within phase |
| CI/CD | GitHub Actions, Tauri builds |

## Architecture Target

```
┌──────────────────────────────────────────────────────────────┐
│  FMRL — Unified Selemene Frontend Platform                   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Desktop  │  │ watchOS  │  │ Widgets  │  │ Menu Bar    │ │
│  │ (Tauri)  │  │ (Swift)  │  │ (Swift)  │  │ (Tauri/SW)  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│       └──────────────┼───────────┼─────────────────┘        │
│                      │           │                           │
│  ┌───────────────────┴───────────┴──────────────────────┐   │
│  │  Shared Engine Client Layer (TypeScript)              │   │
│  │  — SelemeneClient (mirrors noesis-sdk)                │   │
│  │  — EngineInput/EngineOutput types                     │   │
│  │  — Auth (JWT), caching, error handling                │   │
│  │  — Engine result renderers (per-engine UI components) │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │                                      │
│         ┌─────────────┼──────────────┐                      │
│         ▼             ▼              ▼                       │
│  ┌────────────┐ ┌──────────┐  ┌──────────────┐             │
│  │ Local      │ │ Selemene │  │ Supabase     │             │
│  │ Biofield   │ │ API      │  │ (Auth, Data) │             │
│  │ (Python)   │ │ (Rust)   │  │              │             │
│  └────────────┘ └──────────┘  └──────────────┘             │
└──────────────────────────────────────────────────────────────┘
```

## Phase Map

| Phase | Name | Scope | Est. Tasks | Depends On |
|-------|------|-------|-----------|------------|
| 0 | Foundation & Cleanup | Naming, repo hygiene, project structure | 10-12 | — |
| 1 | Multi-Engine Architecture | Selemene client, engine abstraction, auth bridge | 12-15 | Phase 0 |
| 2 | Timing Engines | Panchanga, Vedic Clock, Biorhythm, Numerology | 12-15 | Phase 1 |
| 3 | Profile Engines | Human Design, Gene Keys | 10-12 | Phase 1 |
| 4 | Workflows & Synthesis | birth-blueprint, daily-practice, multi-engine views | 10-12 | Phase 2+3 |
| 5 | Platform Expansion | watchOS, widgets, menu bar applet | 12-15 | Phase 2 |
| 6 | Production & Polish | CI/CD, testing, performance, accessibility, App Store | 10-12 | Phase 4+5 |

**Total estimated: ~80 tasks across all phases**

## Two-Layer Execution Model

### Layer 1: Phase Documents (this plan)
- Created NOW, stored in `.plan/phases/`
- Each is a self-contained PRD with: context, architecture decisions, file manifest, acceptance criteria
- Serves as the "contract" — agents read this, not 400 tasks
- Phase docs are the drift-prevention mechanism

### Layer 2: Micro-Tasks (at execution time)
- When a phase is ready to execute, its document spawns 10-15 micro-tasks
- Each task → GitHub issue with labels (phase, wave, swarm, area)
- Parallel agents claim issues, execute, and close with evidence
- Phase doc remains the source of truth; issues are the execution tracking

### Execution Flow
```
Phase Doc (.plan/phases/PHASE-N.md)
    │
    ├── [User says "execute phase N"]
    │
    ├── Spawn micro-tasks → GitHub Issues
    │   ├── Wave 1 (foundation work)
    │   │   ├── Swarm A: [issues 1-3] → Agent 1
    │   │   └── Swarm B: [issues 4-6] → Agent 2
    │   │
    │   ├── Wave 2 (depends on Wave 1)
    │   │   ├── Swarm C: [issues 7-9] → Agent 3
    │   │   └── Swarm D: [issues 10-12] → Agent 4
    │   │
    │   └── Wave 3 (verification)
    │       └── Swarm E: [issues 13-15] → Agent 5
    │
    └── Phase complete when all issues closed with evidence
```

## Selemene API Contract (for all phases)

**Base URL:** `https://selemene.tryambakam.space/api/v1/`
**Auth:** JWT via `POST /auth/login` or Supabase session bridging
**Engine call:** `POST /engines/:engine_id/calculate` with `EngineInput`
**Workflow call:** `POST /workflows/:workflow_id/execute` with `EngineInput`
**Response:** `EngineOutput { engine_id, result, witness_prompt, consciousness_level, metadata }`

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Selemene API not stable enough for FMRL | Phase 1 builds client with mock fallback; validate API contract before Phase 2 |
| Biofield compute breaks during refactor | Phase 0 establishes test baseline; biofield pipeline is untouched until Phase 4 |
| watchOS/widgets require native Swift | Phase 5 is independent; can be deferred without blocking other phases |
| Auth model mismatch (Supabase vs Selemene JWT) | Phase 1 builds auth bridge as first priority |
| Drift in parallel agent execution | Phase docs are immutable contracts; micro-tasks reference doc sections |

## File References

| File | Purpose |
|------|---------|
| `.plan/MASTER-PLAN.md` | This file — overall vision and phase map |
| `.plan/phases/PHASE-0-foundation.md` | Cleanup, naming, structure |
| `.plan/phases/PHASE-1-multi-engine.md` | Core architecture layer |
| `.plan/phases/PHASE-2-timing-engines.md` | Panchanga, Vedic Clock, Biorhythm, Numerology |
| `.plan/phases/PHASE-3-profile-engines.md` | Human Design, Gene Keys |
| `.plan/phases/PHASE-4-workflows.md` | Multi-engine workflows and synthesis |
| `.plan/phases/PHASE-5-platforms.md` | watchOS, widgets, menu bar |
| `.plan/phases/PHASE-6-production.md` | CI/CD, testing, polish, release |
