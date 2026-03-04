# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: React + TypeScript + Vite UI, Tailwind CSS, charts, and web workers.
- `backend/`: FastAPI service (`main.py`) with domain modules under `api/`, `core/`, `models/`, `db/`, and `utils/`.
- `scripts/`: project utilities and task files (if added).
- Top-level specs: `PIP_*_Specification.md`, `METRICS_*`, and `technical-blog.md` for domain context.
- Deployment: `docker-compose.yml` and `docker-compose.prod.yml` for full-stack containers.

## Build, Test, and Development Commands
- Frontend dev server: `npm run dev` (run inside `frontend/`).
- Frontend build: `npm run build` (TypeScript build + Vite bundle).
- Frontend lint: `npm run lint` (ESLint).
- Frontend preview: `npm run preview` (serve built assets).
- Backend dev server: `python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000` (run inside `backend/`).
- Full stack via Docker: `docker compose up --build` (from repo root).

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
- Keep secrets out of source control; use Docker or local env files for credentials.
