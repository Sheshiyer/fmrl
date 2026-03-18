# Phase 4: Workflows & Synthesis Views

> Build multi-engine workflow execution and synthesis views that combine
> results from multiple engines into unified reflection experiences.

## Context

Selemene defines 6 canonical workflows that orchestrate multiple engines
in parallel and synthesize their outputs. This is where FMRL becomes more
than a collection of engine viewers — it becomes a coherent reflection tool.

### Selemene Workflows

| Workflow | Phase | Engines | Use Case |
|----------|-------|---------|----------|
| `birth-blueprint` | 0 | numerology, human-design, vimshottari | Core identity mapping |
| `daily-practice` | 0 | panchanga, vedic-clock, biorhythm | Daily rhythm optimization |
| `decision-support` | 1 | tarot, i-ching, human-design | Multi-perspective decisions |
| `self-inquiry` | 2 | gene-keys, enneagram | Shadow work & exploration |
| `creative-expression` | 1 | sigil-forge, sacred-geometry | Generative/aesthetic |
| `full-spectrum` | 3 | All 16 engines | Complete toolkit |

## Scope

- Workflow execution UI (input → progress → synthesized result)
- Synthesis view that combines multiple engine outputs meaningfully
- Workflow-specific layouts (birth-blueprint is different from daily-practice)
- Readings history with search/filter
- Workflow recommendation based on user's consciousness level
- Integration of biofield data with other engine results (the unique FMRL value)

## Architecture Decisions

### Workflow Execution Flow (UI)
```
Input Form → Submit → Progress (show each engine completing) → Synthesis View
```
The Selemene API executes engines in parallel server-side. Client shows
a progress indicator per engine as they complete (if streaming supported)
or a single loading state.

### Biofield + Engine Correlation (FMRL Unique)
FMRL's killer feature: correlate real-time biofield readings with
engine calculations. "Your biofield coherence is 85 right now, and
your Panchanga shows this is a Brahma Muhurta — peak meditation window."

This requires:
- Snapshot biofield state at workflow execution time
- Include biofield scores in synthesis view alongside engine results

### Synthesis Rendering
Workflow results come with a `synthesis` object containing `key_themes`,
`insights`, and `recommendations`. Render this as a narrative section
above the individual engine results grid.

## Key Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/pages/WorkflowExecutionPage.tsx` | Workflow input + execution |
| `frontend/src/components/Workflows/WorkflowProgress.tsx` | Multi-engine progress |
| `frontend/src/components/Workflows/SynthesisView.tsx` | Combined result narrative |
| `frontend/src/components/Workflows/EngineResultGrid.tsx` | Grid of individual results |
| `frontend/src/components/Workflows/BioCorrelation.tsx` | Biofield + engine correlation |
| `frontend/src/components/Workflows/WorkflowCard.tsx` | Workflow selector card |
| `frontend/src/pages/ReadingsHistoryPage.tsx` | Past readings with search |
| `frontend/src/hooks/useWorkflow.ts` | Workflow execution hook |
| `frontend/src/hooks/useBioCorrelation.ts` | Biofield snapshot + correlation |

## Wave Structure (at execution time)

### Wave 1: Workflow Execution
- **Swarm A (Execution):** WorkflowExecutionPage, useWorkflow hook, WorkflowProgress
- **Swarm B (Synthesis):** SynthesisView, EngineResultGrid layout

### Wave 2: Special Views (parallelizable)
- **Swarm C (Bio-Correlation):** BioCorrelation component, useBioCorrelation hook
- **Swarm D (History):** ReadingsHistoryPage with search/filter/date range

### Wave 3: Polish
- **Swarm E (Workflow Cards):** WorkflowCard, workflow recommendation, directory
- **Swarm F (Integration):** Wire into navigation, test all 6 workflows

## Acceptance Criteria

- [ ] birth-blueprint workflow executes and displays synthesized identity map
- [ ] daily-practice workflow shows today's timing + rhythms in unified view
- [ ] Workflow progress shows per-engine completion status
- [ ] Synthesis narrative (key_themes, insights, recommendations) renders above results
- [ ] Biofield correlation snapshot captured at workflow execution time
- [ ] Readings history page lists past readings with date filter
- [ ] Phase-gated workflows show appropriate messaging if user level too low
- [ ] All 6 workflows accessible from workflow directory
- [ ] Witness prompts from each engine displayed in workflow results

## Anti-Criteria

- [ ] No AI synthesis on client — all synthesis comes from Selemene API
- [ ] No modification to Selemene's workflow definitions
- [ ] No new engine calculations — only consume existing API responses

## Estimated Tasks: 10-12
## Dependencies: Phase 2 + Phase 3 (engine renderers for workflow result display)
