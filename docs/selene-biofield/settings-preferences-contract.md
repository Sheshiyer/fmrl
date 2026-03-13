# Settings Preferences Contract — Biofield Mirror

_Last updated: 2026-03-08_

## Purpose
Define the local-first settings schema currently used by the app and the intended future mapping into Selene profile preferences.

## Current storage model
The current implementation uses a split model:
- local-first full settings cache in `localStorage['biofield_settings_v1']`
- backend-mediated synced subset for stable user settings via `public.user_profiles.preferences`

Current sync path:
- `GET /api/v1/profile/settings?user_id=<uuid>`
- `PATCH /api/v1/profile/settings`

## Current settings domains

### `appearance`
```json
{
  "themeMode": "sacred-dark | dim | high-contrast",
  "workspaceDensity": "compact | balanced | spacious",
  "motionLevel": "full | reduced | minimal",
  "accentProfile": "gold | violet | neutral",
  "showOverlayLegend": true,
  "showStageSignals": true
}
```

### `runtime`
```json
{
  "showBackendLogs": true,
  "showDiagnosticsSummary": true,
  "autoFallbackToPreview": true,
  "enableBackendCapture": true
}
```

### `capture`
```json
{
  "defaultAnalysisRegion": "full | face | body",
  "autoCreateSnapshot": true,
  "suggestBaselineAfterCapture": true,
  "exportBundle": "json | html | pdf | bundle",
  "snapshotLabelTemplate": "Captured Analysis — {date} {time}"
}
```

## Intended future canonical home
Once backend-mediated preference writes are ready, the stable user-level subset should map into:
- `public.user_profiles.preferences`

Suggested namespace layout:
```json
{
  "appearance": { ... },
  "runtime": { ... },
  "capture": { ... },
  "export": {
    "bundle": "bundle"
  }
}
```

## Storage guidance
### Keep local-first
- diagnostics and device-oriented runtime controls
- backend log visibility
- fallback behavior policies tied to one shell/runtime

### Synced now
- appearance preferences
- default analysis region
- snapshot auto-create preference
- snapshot label template
- export bundle preference
- baseline suggestion preference

### Syncable later if desired
- additional stable shell appearance variants
- future export/report defaults beyond the current capture namespace

## Guardrails
- Do not rely on direct client-side Supabase writes for settings yet.
- Prefer backend-mediated writes once identity flow is normalized.
- Keep Account responsible for identity and history; keep Settings responsible for behavior and defaults.
