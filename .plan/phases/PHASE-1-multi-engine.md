# Phase 1: Multi-Engine Architecture

> Build the shared engine client layer that allows FMRL to consume
> any of Selemene's 16 engines and 6 workflows through a typed
> TypeScript client, with auth bridging and engine result rendering.

## Context

FMRL currently only talks to its local Python FastAPI backend for biofield
compute. To become the Selemene frontend platform, it needs a TypeScript
client that mirrors the Rust `noesis-sdk` — calling any engine, any workflow,
with proper auth, caching, and error handling.

The Selemene API lives at `https://selemene.tryambakam.space/api/v1/` and
exposes a uniform interface: `POST /engines/:engine_id/calculate` with
`EngineInput` → `EngineOutput`.

## Scope

- Create `SelemeneClient` TypeScript class (mirrors `noesis-sdk`)
- Define TypeScript types for `EngineInput`, `EngineOutput`, `WorkflowResult`, `ValidationResult`
- Build auth bridge: Supabase session → Selemene JWT (or unified auth flow)
- Create engine result renderer framework (per-engine UI components)
- Add engine navigation (sidebar/tabs for switching between engines)
- Build engine loading states, error states, empty states

## Architecture Decisions

### SelemeneClient Location
`frontend/src/services/SelemeneClient.ts` — single file, no heavy abstraction.

### Type Definitions
`frontend/src/types/selemene.ts` — all Selemene API types.

### Auth Strategy
Two auth paths coexist:
1. **Supabase Auth** (existing) — for local biofield data, user profiles
2. **Selemene JWT** (new) — for engine calculations, readings, workflows

Bridge: On Supabase login, exchange Supabase JWT for Selemene JWT via
`POST /api/v1/auth/login` (or implement Supabase-as-identity-provider
on Selemene side). Store Selemene token alongside Supabase session.

### Engine Result Rendering
Each engine gets a dedicated renderer component:
```
frontend/src/components/Engines/
  ├── EngineResultRenderer.tsx    # Router — picks correct renderer by engine_id
  ├── BiorhythmResult.tsx
  ├── NumerologyResult.tsx
  ├── PanchangaResult.tsx
  ├── VedicClockResult.tsx
  ├── HumanDesignResult.tsx
  ├── GeneKeysResult.tsx
  └── GenericResult.tsx           # Fallback for engines without custom renderer
```

### Navigation Model
Add engine picker to the app shell. Dashboard stays biofield-focused.
New routes:
- `/engines` — engine directory
- `/engines/:engineId` — single engine view with input + result
- `/workflows/:workflowId` — multi-engine workflow view
- `/readings` — past readings history

## Key Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/services/SelemeneClient.ts` | API client — calculate, workflow, readings, auth |
| `frontend/src/types/selemene.ts` | EngineInput, EngineOutput, WorkflowResult types |
| `frontend/src/hooks/useSelemene.ts` | React hook wrapping SelemeneClient with state |
| `frontend/src/hooks/useEngine.ts` | Hook for single engine calculation + loading/error |
| `frontend/src/components/Engines/EngineResultRenderer.tsx` | Engine result router |
| `frontend/src/components/Engines/GenericResult.tsx` | Fallback renderer |
| `frontend/src/pages/EngineDirectoryPage.tsx` | List all available engines |
| `frontend/src/pages/EnginePage.tsx` | Single engine view |
| `frontend/src/pages/WorkflowPage.tsx` | Workflow execution view |
| `frontend/src/pages/ReadingsPage.tsx` | Past readings history |

## Key Files to Modify

| File | Change |
|------|--------|
| `frontend/src/router/index.tsx` | Add engine/workflow/readings routes |
| `frontend/src/components/Layout/Shell.tsx` | Add engine navigation to sidebar |
| `frontend/src/context/auth/AuthContext.tsx` | Add Selemene JWT bridging |
| `frontend/src/context/AppContext.tsx` | Add Selemene connection state |

## Selemene API Contract

```typescript
// SelemeneClient methods (mirrors noesis-sdk)
class SelemeneClient {
  constructor(baseUrl: string, token?: string)

  // Auth
  login(email: string, password: string): Promise<{ access_token: string }>
  setToken(token: string): void

  // Engines
  listEngines(): Promise<EngineInfo[]>
  calculate(engineId: string, input: EngineInput): Promise<EngineOutput>
  validate(engineId: string, output: EngineOutput): Promise<ValidationResult>

  // Workflows
  listWorkflows(): Promise<WorkflowInfo[]>
  executeWorkflow(workflowId: string, input: EngineInput): Promise<WorkflowResult>

  // Readings
  listReadings(limit?: number): Promise<ReadingRecord[]>
  getReading(readingId: string): Promise<ReadingRecord>

  // User
  getMe(): Promise<UserProfile>

  // Health
  health(): Promise<boolean>
}
```

## Wave Structure (at execution time)

### Wave 1: Foundation (sequential — types before client)
- **Swarm A (Types):** Create `selemene.ts` types matching Selemene API contract
- **Swarm B (Client):** Build `SelemeneClient.ts` with all methods

### Wave 2: Integration (parallelizable)
- **Swarm C (Auth):** Build auth bridge — Supabase → Selemene JWT exchange
- **Swarm D (Hooks):** Create `useSelemene`, `useEngine` hooks
- **Swarm E (Routing):** Add engine/workflow/readings routes to router

### Wave 3: UI (parallelizable)
- **Swarm F (Navigation):** Engine picker in Shell, engine directory page
- **Swarm G (Renderers):** EngineResultRenderer + GenericResult fallback
- **Swarm H (Pages):** EnginePage, WorkflowPage, ReadingsPage

### Wave 4: Verification
- **Swarm I (Test):** Verify client connects to live Selemene API
- **Swarm J (Build):** Full build + Tauri desktop test

## Acceptance Criteria

- [ ] SelemeneClient can authenticate and call any engine endpoint
- [ ] TypeScript types match Selemene's EngineInput/EngineOutput exactly
- [ ] Auth bridge exchanges Supabase session for Selemene JWT
- [ ] Engine directory page lists all available engines from live API
- [ ] Single engine page accepts input and renders result
- [ ] GenericResult renderer handles any engine output gracefully
- [ ] Existing biofield dashboard is unaffected
- [ ] New routes accessible from app navigation
- [ ] Past readings are retrievable and displayable
- [ ] Error states (API down, auth expired, phase denied) handled in UI

## Anti-Criteria

- [ ] No changes to biofield compute pipeline (ComputeRouter, MetricsCalculator)
- [ ] No changes to Python FastAPI backend
- [ ] No custom renderers for specific engines yet (except GenericResult) — that's Phase 2+3
- [ ] No watchOS or widget code — that's Phase 5

## Estimated Tasks: 12-15
## Dependencies: Phase 0 (clean naming)
