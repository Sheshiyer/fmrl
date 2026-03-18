# Phase 3: Profile Engines — Human Design & Gene Keys

> Build rich, interactive UI renderers for the two deepest "profile"
> engines — Human Design and Gene Keys. These are the crown jewels
> of the reflection experience, requiring complex visual layouts
> and deep data rendering.

## Context

Human Design and Gene Keys are fundamentally different from timing engines.
They produce static, birth-data-derived profiles that are deeply complex:
- **Human Design:** Body Graph (9 centers, 36 channels, 64 gates), Type, Strategy, Authority, Profile
- **Gene Keys:** 64 gene keys mapped to a Hologenetic Profile (Life's Work, Evolution, Radiance, Purpose, Pearl sequence)

These require significantly richer UI than timing cards — interactive diagrams,
layered information disclosure, and potentially the most visually striking
screens in the app.

## Scope

- Human Design Body Graph interactive visualization
- Gene Keys Hologenetic Profile visualization
- Detailed drill-down views for individual gates/keys
- Cross-engine correlation (HD gates map 1:1 to Gene Keys)
- Profile summary cards for dashboard integration

## Architecture Decisions

### Body Graph Rendering
Options: SVG (recommended), Canvas, or external library.
**Decision: SVG** — it's interactive (clickable centers/channels), scalable,
and the geometry is fixed (9 centers, known positions). Build as a React
component with SVG elements.

### Information Density Management
Both engines produce enormous amounts of data. Use progressive disclosure:
1. **Summary view:** Type + Strategy + Authority (HD) / Life's Work key (GK)
2. **Graph view:** Full Body Graph / Hologenetic Profile diagram
3. **Detail view:** Click any gate/key → expanded explanation + witness prompt

### Gate-Key Correlation
HD Gate 1 = GK Key 1 (they share the same 64 hexagrams). When displaying
an HD gate, offer a "See Gene Key" link and vice versa. This cross-reference
is a unique FMRL value-add.

## Key Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/components/Engines/HumanDesignResult.tsx` | HD result container |
| `frontend/src/components/Engines/HumanDesign/BodyGraph.tsx` | SVG Body Graph visualization |
| `frontend/src/components/Engines/HumanDesign/CenterDetail.tsx` | Center drill-down |
| `frontend/src/components/Engines/HumanDesign/ChannelDetail.tsx` | Channel/gate detail |
| `frontend/src/components/Engines/HumanDesign/TypeCard.tsx` | Type + Strategy + Authority card |
| `frontend/src/components/Engines/GeneKeysResult.tsx` | GK result container |
| `frontend/src/components/Engines/GeneKeys/HologeneticProfile.tsx` | Profile sequence diagram |
| `frontend/src/components/Engines/GeneKeys/KeyDetail.tsx` | Individual key Shadow→Gift→Siddhi |
| `frontend/src/components/Engines/GeneKeys/SequenceView.tsx` | Activation/Venus/Pearl sequence |

## Wave Structure (at execution time)

### Wave 1: Human Design (complex — may need 2 agents)
- **Swarm A (Graph):** BodyGraph SVG component with 9 centers, channels, defined/undefined states
- **Swarm B (Details):** TypeCard, CenterDetail, ChannelDetail, gate descriptions

### Wave 2: Gene Keys (parallelizable with HD)
- **Swarm C (Profile):** HologeneticProfile diagram, sequence navigation
- **Swarm D (Keys):** KeyDetail (Shadow→Gift→Siddhi), cross-reference to HD gates

### Wave 3: Integration
- **Swarm E (Dashboard):** Profile summary cards, cross-engine correlation links
- **Swarm F (Register):** Wire into EngineResultRenderer, verify routing

### Wave 4: Verification
- **Swarm G:** Test both engines with real birth data against Selemene API

## Acceptance Criteria

- [ ] Body Graph renders all 9 centers with defined/undefined visual states
- [ ] Body Graph shows channels connecting centers (defined = colored, undefined = grey)
- [ ] HD Type, Strategy, Authority, Profile displayed prominently
- [ ] Clicking a center/channel opens detail view with gate information
- [ ] Gene Keys Hologenetic Profile renders all 4 sequences
- [ ] Individual Gene Key shows Shadow, Gift, Siddhi progression
- [ ] Cross-reference links work: HD Gate N → Gene Key N and vice versa
- [ ] Both renderers handle the full data structure from Selemene API
- [ ] Profile summary cards work on dashboard
- [ ] Witness prompts from engine output displayed in both renderers

## Anti-Criteria

- [ ] No HD/GK calculation on client — all data from Selemene API
- [ ] No 3D rendering or heavy animation libraries
- [ ] No audio/video content for Gene Keys (keep it text + visual)
- [ ] No editable chart features — read-only reflection tool

## Estimated Tasks: 10-12
## Dependencies: Phase 1 (SelemeneClient, EngineResultRenderer framework)
## Can run in parallel with: Phase 2 (different engines, no overlap)
