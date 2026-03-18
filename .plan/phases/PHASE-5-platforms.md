# Phase 5: Platform Expansion — watchOS, Widgets, Menu Bar

> Extend FMRL beyond the desktop app to watchOS companion, macOS
> system widgets, and a menu bar applet — making Selemene engines
> available at a glance throughout the user's day.

## Context

The timing engines (Phase 2) produce data that's perfectly suited for
glanceable interfaces. Panchanga Tithi, Vedic Clock Hora, Biorhythm
cycles, Personal Day number — these are "check once, carry all day"
data points that belong on a watch face or system widget.

The `TimingWidgetData` type from Phase 2 was designed specifically as
the data contract for this phase.

## Scope

- watchOS companion app with complications
- macOS WidgetKit widgets (Today view + Lock Screen)
- Menu bar applet showing current timing engine data
- Shared data layer between Tauri app and native extensions
- Background refresh for timing data

## Architecture Decisions

### watchOS Approach
**Swift + SwiftUI** — watchOS requires native development. FMRL's Tauri
desktop app can't run on watchOS directly. The watchOS app will:
1. Use Selemene API directly (same TypeScript types ported to Swift Codable)
2. Share auth credentials via Apple Keychain (shared app group)
3. Display complications with timing engine data
4. Sync birth data from the desktop app via iCloud/App Group

### Widget Architecture
macOS WidgetKit widgets (introduced in macOS 14+):
- **Small:** Single engine summary (Panchanga Tithi or Personal Day)
- **Medium:** Today strip (all 4 timing engines)
- **Large:** Full timing dashboard + biorhythm chart

Widgets use Swift + WidgetKit timeline provider. Data fetched from
Selemene API with `TimelineProvider` refresh schedule.

### Menu Bar Applet
Two options:
1. **Tauri system tray** (built-in Tauri feature) — simple, no native code
2. **Native Swift menu bar app** — richer, can include mini-widget

**Decision: Tauri system tray first** — lowest effort, works today.
Upgrade to native Swift if UX demands it.

### Data Sharing
```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Tauri App  │────▶│ App Group    │────▶│ watchOS App  │
│  (desktop)  │     │ (shared      │     │ (Swift)      │
│             │     │  UserDefaults│     │              │
│             │     │  + Keychain) │     │ WidgetKit    │
│             │     │              │     │ Widgets      │
└─────────────┘     └──────────────┘     └──────────────┘
                          │
                          ▼
                    Selemene API
                    (source of truth)
```

## Key Files to Create

| File | Purpose |
|------|---------|
| `watchos/FMRLWatch/` | watchOS Xcode project |
| `watchos/FMRLWatch/ContentView.swift` | Main watch face |
| `watchos/FMRLWatch/Complications/` | Watch complications |
| `watchos/FMRLWatch/Services/SelemeneService.swift` | API client (Swift) |
| `watchos/FMRLWatch/Models/` | Swift Codable types matching EngineOutput |
| `widgets/FMRLWidgets/` | WidgetKit extension |
| `widgets/FMRLWidgets/TimingWidget.swift` | Timing engine widget |
| `widgets/FMRLWidgets/TimelineProvider.swift` | Data refresh provider |
| `frontend/src-tauri/src/tray.rs` | Tauri system tray with timing data |

## Wave Structure (at execution time)

### Wave 1: Menu Bar (quickest win)
- **Swarm A (Tray):** Tauri system tray showing current Panchanga + Vedic Clock
- **Swarm B (Data):** Background refresh service for timing data

### Wave 2: WidgetKit (macOS native)
- **Swarm C (Widget):** WidgetKit extension with Small/Medium/Large layouts
- **Swarm D (Provider):** TimelineProvider with Selemene API integration

### Wave 3: watchOS (most complex)
- **Swarm E (App):** watchOS SwiftUI app with engine views
- **Swarm F (Complications):** Watch face complications
- **Swarm G (Sync):** Auth sharing, birth data sync via App Group

### Wave 4: Verification
- **Swarm H:** Test all platforms, verify data freshness and sync

## Acceptance Criteria

- [ ] Menu bar icon shows current Vedic Clock Hora
- [ ] Menu bar dropdown shows Panchanga, Biorhythm, Personal Day
- [ ] WidgetKit Small widget shows single engine value
- [ ] WidgetKit Medium widget shows all 4 timing engines
- [ ] Widgets refresh on schedule (hourly for Panchanga, minutely for Vedic Clock)
- [ ] watchOS app displays timing engine summaries
- [ ] watchOS complications show Tithi and Personal Day on watch face
- [ ] Auth credentials shared between desktop and watch via Keychain
- [ ] Birth data syncs from desktop to watch via App Group
- [ ] All platforms consume same Selemene API endpoints

## Anti-Criteria

- [ ] No biofield viewer on watchOS (camera pipeline is desktop-only)
- [ ] No complex engine renderers (HD Body Graph, GK Profile) on watch/widget
- [ ] No offline engine calculation — always requires API
- [ ] No iOS app yet — watchOS companion only

## Estimated Tasks: 12-15
## Dependencies: Phase 2 (timing engines, TimingWidgetData type)
## Can start after: Phase 2 complete (doesn't need Phase 3 or 4)
