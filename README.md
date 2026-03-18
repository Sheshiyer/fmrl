# FMRL

> **Frequency Modulated Reality Lens** — pronounced "ephemeral"

A real-time biofield analysis platform for PIP (Polycontrast Interference Photography) imaging workflows. FMRL provides web, API, and desktop interfaces for capturing, analyzing, and visualizing biofield data.

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](./CHANGELOG.md)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri)](https://tauri.app/)
[![License](https://img.shields.io/badge/license-Proprietary-lightgrey.svg)]()

---

## What is FMRL?

FMRL bridges cutting-edge computer vision with biofield research. The system captures live video feeds, applies real-time PIP visualization processing, and calculates quantitative biofield metrics including:

- **Energy Distribution** — overall field strength and vitality
- **Symmetry Analysis** — left/right balance metrics
- **Coherence Scoring** — field stability and organization
- **Complexity Measures** — information density patterns
- **Regulation Indices** — autonomic response indicators
- **Color Balance** — chromatic field distribution

### Live Demo

🌐 **Web App:** [https://fmrl.tryambakam.space](https://fmrl.tryambakam.space)

---

## Apps & Services

| Component | Tech Stack | Description |
|-----------|------------|-------------|
| **Web App** | React 19 + Vite + Tailwind CSS | Browser-based analysis interface with real-time video processing |
| **Backend API** | FastAPI + Python + OpenCV | Analysis engine, WebSocket streaming, data persistence |
| **Desktop App** | Tauri v2 (Rust) + React | Native macOS application with offline capabilities |
| **Database** | Supabase (PostgreSQL) | User profiles, session storage, analysis history |

---

## Packages

### `frontend/` — Web & Desktop Application

```bash
cd frontend
npm install
npm run dev          # Web dev server
npm run tauri:dev    # Desktop dev mode
npm run tauri:build  # Build desktop app
```

**Key Dependencies:**
- React 19 + React Router 7
- TensorFlow.js + MediaPipe (computer vision)
- WebGL2 PIP shaders (TouchDesigner-style noise TOP)
- Recharts (data visualization)
- Framer Motion (animations)

### `backend/` — Analysis API

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Key Capabilities:**
- Real-time video analysis via WebSocket
- Static image batch processing
- PIP metric extraction (energy, symmetry, coherence)
- Audio entrainment generation
- PDF/CSV export

### `frontend/src-tauri/` — Desktop Shell

Tauri v2 configuration for building native macOS apps with camera, microphone, and file system access.

---

## Quick Start

### Development (Full Stack)

```bash
# Terminal 1 — Backend
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev

# Open http://localhost:5173
```

### Docker (Production)

```bash
# Development
docker compose up --build

# Production
docker compose -f docker-compose.prod.yml up -d
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Web App     │  │  Desktop App │  │  Mobile (future)         │   │
│  │  (Browser)   │  │  (Tauri)     │  │                          │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┬───────────┘   │
│         │                 │                         │               │
│         └─────────────────┴─────────────────────────┘               │
│                           │                                         │
│                    WebSocket / REST API                             │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────────┐
│                         API LAYER (FastAPI)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  Analysis Engine │  │  Auth / Sessions │  │  Export Service  │   │
│  │  (OpenCV/NumPy)  │  │  (Supabase)      │  │  (PDF/CSV)       │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Documentation

- [PIP Analysis System Specification](./PIP_Analysis_System_Specification.md)
- [Web & Tauri Release Guide](./docs/deployment/fmrl-web-and-tauri-release.md)
- [macOS Desktop Release](./docs/deployment/tauri-macos-release.md)
- [Technical Blog: TouchDesigner Noise TOP in WebGL](./technical-blog.md)

---

## Deployment

The project uses GitHub Actions for CI/CD:

- **Push to `main`** triggers automated build and deploy
- **Docker images** pushed to Docker Hub
- **Production** deployed to DigitalOcean droplet
- **Domain:** `fmrl.tryambakam.space`

See [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) for details.

---

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for release notes.

| Version | Date | Notes |
|---------|------|-------|
| v0.0.1 | 2026-03-18 | Initial public release |

---

## Roadmap

- [x] Real-time PIP video analysis
- [x] Web dashboard with live metrics
- [x] Desktop macOS app (Tauri)
- [x] Supabase auth & persistence
- [x] Audio entrainment generation
- [ ] iOS native app
- [ ] Backend bundling as Tauri sidecar
- [ ] AI-powered pattern recognition
- [ ] Multi-user research dashboards

---

## License

Proprietary — All rights reserved.

---

<p align="center">
  <em>FMRL — Seeing the unseen</em>
</p>
