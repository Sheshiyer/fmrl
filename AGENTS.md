# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: React + TypeScript + Vite UI, Tailwind CSS, charts, and web workers.
- `backend/`: FastAPI service (`main.py`) with domain modules under `api/`, `core/`, `models/`, `db/`, and `utils/`.
- `scripts/`: project utilities and task files (if added).
- Top-level specs: `PIP_*_Specification.md`, `METRICS_*`, and `technical-blog.md` for domain context.
- Deployment: Tauri desktop app (`frontend/src-tauri`) + Selemene engines API on Railway + Supabase Auth/Data.

## Build, Test, and Development Commands
- Frontend dev server: `npm run dev` (run inside `frontend/`).
- Frontend build: `npm run build` (TypeScript build + Vite bundle).
- Frontend lint: `npm run lint` (ESLint).
- Frontend preview: `npm run preview` (serve built assets).
- Backend dev server: `python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000` (run inside `backend/`).
- Backend API dependency: Selemene engines API hosted on Railway (`selemene.tryambakam.space`).

## Coding Style & Naming Conventions
- Frontend: TypeScript/TSX with 2-space indentation; components are `PascalCase`, hooks are `useCamelCase`.
- Backend: Python with 4-space indentation; follow PEP 8 and keep APIs typed when possible.
- Linting: ESLint config at `frontend/eslint.config.js`. Run `npm run lint` before PRs.
- Prefer small, focused modules and keep files named after their primary export (e.g., `PIPShader.tsx`).

## Testing Guidelines
- No automated test framework is configured yet.
- If adding tests, keep them close to the code (e.g., `frontend/src/**/__tests__` or `backend/tests/`) and document how to run them.

## Commit & Pull Request Guidelines
- Commit history is mixed; prefer Conventional Commit prefixes when possible (`fix:`, `feat:`, `chore:`) and keep messages short.
- PRs should include: a concise summary, testing notes (commands + results), and screenshots for UI changes.

## Configuration & Security Tips
- Backend settings are driven by environment variables; see `backend/config.py` and use a `.env` file when running locally.
- Keep secrets out of source control; use Railway/Supabase environment settings and local `.env` files for development.

## External API Resilience (Selemene / Remote Services)

The frontend depends on the Selemene Engine API — an external service with its own auth (JWT tokens that expire). Follow these rules when writing any code that calls Selemene or similar remote APIs:

### Always use `withAuthRecovery`
Every Selemene API call from a React hook or component MUST be wrapped with `withAuthRecovery` from `useSelemene()`. This transparently handles expired JWT tokens by re-authenticating via the bridge and retrying once.

```tsx
// CORRECT
const { client, withAuthRecovery } = useSelemene();
const data = await withAuthRecovery(() => client.calculate(engineId, input));

// WRONG — raw call will fail silently on token expiry
const data = await client.calculate(engineId, input);
```

### Concurrent calls share recovery
`withAuthRecovery` coalesces concurrent 401 recoveries into a single re-auth roundtrip. When firing multiple API calls via `Promise.allSettled()`, each call independently wraps with `withAuthRecovery` — do NOT build ad-hoc recovery logic per hook.

### Graceful degradation
- Use `Promise.allSettled()` (not `Promise.all()`) for batch API calls so partial results still render.
- Show last-known data when a poll/refresh fails (e.g. Vedic Clock interval keeps previous value on error).
- Surface errors per-section, not as full-page blockers, when only one engine out of several fails.

### Error classification
- **401 / expired JWT** → handled automatically by `withAuthRecovery`
- **CORS / transport** → show "use desktop runtime" message, not a generic error
- **Phase-gated (403 PHASE_ACCESS_DENIED)** → show tier upgrade prompt, not an error
- **Network timeout** → show retry button, keep last-known data

### Token lifecycle
- Selemene JWTs are stored in `localStorage` under `fmrl_selemene_token`.
- Bridge credentials are stored under `fmrl_selemene_bridge`.
- On sign-out, both are cleared. On fresh builds with `--fresh`, WebView localStorage is wiped so re-auth is forced.
- Never cache tokens in React state independently of the auth context — use `useSelemene()` as the single source of truth.
