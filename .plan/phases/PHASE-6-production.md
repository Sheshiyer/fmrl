# Phase 6: Production & Polish

> Harden FMRL for production release: CI/CD pipeline, comprehensive testing,
> performance optimization, accessibility, and App Store submission preparation.

## Context

By this phase, FMRL has a working multi-engine desktop app, timing engine
widgets, and a watchOS companion. Now we need to make it production-ready:
reliable builds, tested code, performant UI, accessible to all users, and
packaged for distribution.

## Scope

- GitHub Actions CI/CD pipeline (lint, test, build, release)
- Tauri code signing and notarization for macOS distribution
- Unit tests for SelemeneClient, hooks, and utility functions
- Integration tests for engine renderers with mock API responses
- E2E tests for critical user flows (login, engine calculation, workflow)
- Performance audit (bundle size, render performance, memory usage)
- Accessibility audit (WCAG 2.1 AA — building on existing a11y work)
- App Store metadata and submission preparation

## Architecture Decisions

### CI/CD Pipeline
```
Push to main → GitHub Actions
  ├── Lint (ESLint + TypeScript)
  ├── Unit Tests (Vitest)
  ├── Integration Tests (Vitest + MSW for API mocking)
  ├── Build Frontend (Vite)
  ├── Build Tauri (macOS universal binary)
  ├── Code Sign + Notarize
  └── Release (GitHub Release + DMG artifact)
```

### Testing Strategy
- **Unit:** SelemeneClient methods, utility functions, type guards
- **Component:** Engine renderers with mock EngineOutput data
- **Integration:** Full page renders with MSW (Mock Service Worker) intercepting Selemene API
- **E2E:** Playwright or Tauri's built-in WebDriver for critical flows

### Code Signing
Tauri supports macOS code signing via environment variables:
- `APPLE_CERTIFICATE` (base64 encoded .p12)
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID` + `APPLE_PASSWORD` (for notarization)

Existing docs at `docs/deployment/tauri-macos-release.md` cover the process.

## Key Files to Create

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | CI pipeline (lint, test, build) |
| `.github/workflows/release.yml` | Release pipeline (sign, notarize, publish) |
| `frontend/src/__tests__/services/SelemeneClient.test.ts` | Client unit tests |
| `frontend/src/__tests__/hooks/useEngine.test.ts` | Hook tests |
| `frontend/src/__tests__/components/Engines/*.test.tsx` | Renderer tests |
| `frontend/src/__mocks__/selemene.ts` | Mock API responses for all engines |
| `frontend/e2e/` | E2E test directory |

## Wave Structure (at execution time)

### Wave 1: CI/CD Foundation
- **Swarm A (CI):** GitHub Actions CI workflow (lint + test + build)
- **Swarm B (Release):** Release workflow with code signing + notarization

### Wave 2: Testing (fully parallelizable)
- **Swarm C (Unit):** SelemeneClient tests, utility tests
- **Swarm D (Component):** Engine renderer tests with mock data
- **Swarm E (Integration):** Page-level tests with MSW

### Wave 3: Quality
- **Swarm F (Performance):** Bundle analysis, render profiling, memory audit
- **Swarm G (Accessibility):** WCAG 2.1 AA audit, fix violations

### Wave 4: Release Prep
- **Swarm H (Distribution):** App Store metadata, screenshots, release notes
- **Swarm I (Verification):** Full E2E flow test on signed build

## Acceptance Criteria

- [ ] CI pipeline runs on every push and PR
- [ ] All tests pass in CI (unit, component, integration)
- [ ] Tauri build produces signed and notarized macOS DMG
- [ ] Release workflow publishes DMG to GitHub Releases
- [ ] SelemeneClient has >80% test coverage
- [ ] All engine renderers have snapshot/component tests
- [ ] Bundle size is <5MB (excluding Tauri binary)
- [ ] No accessibility violations at WCAG 2.1 AA level
- [ ] App launches cleanly from DMG on fresh macOS install
- [ ] Critical flows work: login → engine calc → view result → readings history

## Anti-Criteria

- [ ] No iOS App Store submission (desktop + watchOS only for v1)
- [ ] No load testing (single-user desktop app)
- [ ] No i18n in v1 (English only)
- [ ] No auto-update mechanism in v1 (manual DMG download)

## Estimated Tasks: 10-12
## Dependencies: Phase 4 + Phase 5 (all features complete)
