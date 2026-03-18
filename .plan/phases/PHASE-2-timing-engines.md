# Phase 2: Timing Engines — Panchanga, Vedic Clock, Biorhythm, Numerology

> Build dedicated, beautiful UI renderers for the four "timing" engines —
> the engines that produce daily/cyclical data ideal for glanceable
> interfaces (watchOS, widgets, dashboard cards).

## Context

These four engines share a common trait: they produce time-sensitive,
cyclical data that updates daily or in real-time. This makes them the
natural first integration — they're useful immediately, they're simpler
than profile engines, and their data format maps perfectly to watchOS
complications and system widgets.

### Engine Data Shapes (from Selemene API)

**Panchanga** — Vedic calendar for current day:
- Tithi (lunar day), Nakshatra (lunar mansion), Yoga, Karana
- Muhurta (auspicious time windows)
- Sunrise/sunset, moonrise/moonset

**Vedic Clock** — Real-time Vedic temporal metrics:
- Current Ghati (Vedic time unit), Prahara (watch period)
- Hora (planetary hour), Choghadiya (auspicious period)
- Live countdown to next transition

**Biorhythm** — Cyclic vitality patterns from birth date:
- Physical, Emotional, Intellectual cycles (23/28/33 day)
- Current position + 30-day forecast chart
- Critical days (cycle crossings)

**Numerology** — Pythagorean/Chaldean from birth date + name:
- Life Path, Destiny, Soul Urge, Personality numbers
- Personal Year/Month/Day numbers (time-sensitive)
- Name analysis grid

## Scope

- Build 4 dedicated engine result renderers
- Create shared "timing card" component for dashboard integration
- Add engine-specific input forms (birth data collector, name input for numerology)
- Build real-time update mechanism for Vedic Clock (polling or SSE)
- Create "Today" dashboard section showing timing engine summaries
- Design data shapes for watchOS/widget consumption (Phase 5 prep)

## Architecture Decisions

### Shared Birth Data Input
All four engines need `EngineInput.birth_data`. Create a shared `BirthDataForm`
component that collects date, time, location, timezone — reusable across all engines.
Store in user profile context for persistence.

### Real-Time Updates
Vedic Clock and Panchanga change throughout the day. Two strategies:
1. **Panchanga:** Fetch once daily, cache locally (data is day-granular)
2. **Vedic Clock:** Poll every 60s or compute client-side from known formulas

### Dashboard Integration
Add a "Today" section to the main dashboard (above or alongside biofield):
```
┌─────────────────────────────────────────────────┐
│  TODAY — March 18, 2026                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │ Panchanga│ │Ved. Clock│ │ Biorhythm        ││
│  │ Shukla 3 │ │ Hora: ☉  │ │ P:78 E:45 I:92  ││
│  │ Ashwini  │ │ Ghati: 14│ │ ▁▃▅▇▅▃▁ chart   ││
│  └──────────┘ └──────────┘ └──────────────────┘│
│  ┌──────────────────────────────────────────────┐│
│  │ Personal Day: 7 — Reflection & Inner Work   ││
│  └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### Widget Data Contract
Define a `WidgetData` type that Phase 5 will consume:
```typescript
interface TimingWidgetData {
  engineId: string
  title: string
  primaryValue: string      // "Shukla 3" or "78/45/92"
  secondaryValue?: string   // "Ashwini Nakshatra"
  icon?: string
  updatedAt: string
  expiresAt: string         // When this data becomes stale
}
```

## Key Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/components/Engines/PanchangaResult.tsx` | Panchanga engine renderer |
| `frontend/src/components/Engines/VedicClockResult.tsx` | Vedic Clock live renderer |
| `frontend/src/components/Engines/BiorhythmResult.tsx` | Biorhythm cycles + chart |
| `frontend/src/components/Engines/NumerologyResult.tsx` | Numerology grid + numbers |
| `frontend/src/components/Shared/BirthDataForm.tsx` | Shared birth data input |
| `frontend/src/components/Shared/TimingCard.tsx` | Glanceable timing summary card |
| `frontend/src/components/Dashboard/TodaySection.tsx` | Dashboard "Today" strip |
| `frontend/src/hooks/useTodayEngines.ts` | Fetch + cache daily timing data |
| `frontend/src/types/widgets.ts` | Widget data contract for Phase 5 |

## Key Files to Modify

| File | Change |
|------|--------|
| `frontend/src/pages/DashboardPage.tsx` | Add TodaySection above biofield |
| `frontend/src/components/Engines/EngineResultRenderer.tsx` | Register 4 new renderers |
| `frontend/src/context/AppContext.tsx` | Add birth data to app state |

## Wave Structure (at execution time)

### Wave 1: Shared Components
- **Swarm A (Input):** BirthDataForm, birth data persistence in app state
- **Swarm B (Cards):** TimingCard component, widget data types

### Wave 2: Engine Renderers (fully parallelizable — 4 agents)
- **Swarm C:** PanchangaResult renderer
- **Swarm D:** VedicClockResult renderer (with live polling)
- **Swarm E:** BiorhythmResult renderer (with chart)
- **Swarm F:** NumerologyResult renderer (with grid)

### Wave 3: Dashboard Integration
- **Swarm G:** TodaySection, useTodayEngines hook, dashboard layout update

### Wave 4: Verification
- **Swarm H:** Test all 4 engines against live Selemene API, screenshot results

## Acceptance Criteria

- [ ] Panchanga renderer displays Tithi, Nakshatra, Yoga, Karana for current day
- [ ] Vedic Clock renderer shows live Ghati, Hora, Choghadiya with countdown
- [ ] Biorhythm renderer shows 3 cycles with 30-day forecast chart
- [ ] Numerology renderer shows Life Path, Destiny, Personal Day numbers
- [ ] BirthDataForm collects and persists date, time, location, timezone
- [ ] "Today" section visible on main dashboard with timing summaries
- [ ] TimingCard component renders consistently across all 4 engines
- [ ] Widget data contract (TimingWidgetData type) defined and exported
- [ ] All renderers handle loading, error, and empty states
- [ ] Results match Selemene API output structure exactly

## Anti-Criteria

- [ ] No watchOS or widget implementation (that's Phase 5)
- [ ] No modifications to biofield compute pipeline
- [ ] No chart library heavier than what's already in the project (use canvas/SVG)
- [ ] No client-side astronomical calculations — all data comes from Selemene API

## Estimated Tasks: 12-15
## Dependencies: Phase 1 (SelemeneClient, engine routing, EngineResultRenderer)
