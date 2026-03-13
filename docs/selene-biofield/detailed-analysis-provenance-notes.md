# Detailed Analysis Provenance Notes

_Last updated: 2026-03-08_

## Purpose
The Detailed Analysis screen now exposes explicit provenance and persistence context so users can distinguish between local preview results and persisted Selene-linked analysis records.

## Added signals
### Header badges
- Persistence state
- Snapshot linkage state
- Capture route

### Provenance summary slab
The page now surfaces:
- persistence explanation copy
- snapshot explanation copy
- capture route explanation copy
- persisted reading id
- persisted snapshot id
- persistence error text when available

## Current derivation rules
### Persistence
- `persistedReadingId` present → `Persisted`
- `persistenceState === 'disabled'` → `Persistence Disabled`
- `persistenceState === 'error'` → `Persistence Error`
- otherwise → `Preview Only`

### Snapshot
- `persistedSnapshotId` present → `Snapshot Linked`
- otherwise → `No Snapshot`

### Route
- backend analysis result present → `Backend Capture`
- otherwise → `Local Preview`

## Data contract additions
`CapturedAnalysisData` now includes:
- `captureRoute?: 'backend-capture' | 'local-preview'`
- `persistenceError?: string | null`

## Validation
- frontend compile/build passes via `npm run build`
