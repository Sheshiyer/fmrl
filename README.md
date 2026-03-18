# FMRL

> **Frequency Modulated Reality Lens** — pronounced *ephemeral*

The unified frontend platform for [Selemene Engine](https://selemene.tryambakam.space) — 16 consciousness calculation engines, one reflection interface.

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](./CHANGELOG.md)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri)](https://tauri.app/)

---

## What is FMRL?

FMRL is the mirror you look into. [Selemene Engine](https://github.com/user/Selemene-engine) is the calculation layer underneath.

Where Selemene computes — sub-millisecond Vedic astrology, biorhythm cycles, gene key sequences, human design charts — FMRL *reflects*. It renders those calculations into interfaces you carry throughout your day: a desktop app on your screen, a complication on your watch, a widget on your home screen.

**Not prediction. Reflection. Inquiry. Witness.**

### Currently Working

FMRL ships today with its first engine fully operational:

- **Biofield Analysis** — real-time PIP (Polycontrast Interference Photography) via WebGL2 shaders
- Live camera feed → shader pipeline → quantitative metrics (energy, symmetry, coherence, complexity, regulation, color balance)
- Desktop app (Tauri 2) with Rust compute acceleration + Python fallback
- Supabase auth, session persistence, and data export

### The Vision

Integrate all 16 Selemene engines into a multi-surface reflection platform:

| Surface | Status | Engines |
|---------|--------|---------|
| **Desktop** (Tauri) | Working | Biofield (live) → all 16 engines |
| **watchOS** | Planned | Panchanga, Vedic Clock, Biorhythm, Personal Day |
| **macOS Widgets** | Planned | Timing engines (daily glanceable data) |
| **Menu Bar** | Planned | Current Hora, Tithi, Personal Day |

---

## Selemene Engines

FMRL will surface all 16 consciousness engines from Selemene:

**Vedic Timing** — *daily rhythm*
- Panchanga (Vedic calendar), Vedic Clock (live temporal metrics), Vimshottari (dasha periods), Transits (planetary movements)

**Cycles & Patterns** — *biological rhythm*
- Biorhythm (23/28/33-day cycles), Numerology (Pythagorean + Chaldean), Biofield (real-time PIP analysis)

**Identity Maps** — *who you are*
- Human Design (Body Graph), Gene Keys (Hologenetic Profile), Face Reading, Enneagram

**Symbolic Mirrors** — *inquiry tools*
- Tarot, I Ching, Sacred Geometry, Sigil Forge, Nadabrahman (sound consciousness)

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  FMRL — Frontend Platform                                │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Desktop  │  │ watchOS  │  │ Widgets  │  │ MenuBar │ │
│  │ (Tauri)  │  │ (Swift)  │  │ (Swift)  │  │ (Tray)  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       └──────────────┴───────────┴──────────────┘       │
│                      │                                   │
│  ┌───────────────────┴───────────────────────────────┐  │
│  │  Shared Engine Client (TypeScript / Swift)         │  │
│  └───────┬──────────────────┬────────────────────────┘  │
│          │                  │                            │
│  ┌───────┴────────┐ ┌──────┴──────┐                    │
│  │ Local Biofield │ │ Selemene API │                    │
│  │ (Python/Rust)  │ │ (15 engines) │                    │
│  └────────────────┘ └─────────────┘                     │
└──────────────────────────────────────────────────────────┘
```

- **Local compute** — Biofield engine runs locally (camera → WebGL shader → metrics via Python/Rust)
- **Remote compute** — Other 15 engines call Selemene API (`selemene.tryambakam.space/api/v1/`)
- **Auth** — Supabase for user data + Selemene JWT for engine access

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.9+ (for biofield backend)
- Rust toolchain (for Tauri desktop builds)

### Development

```bash
# Frontend (web dev server)
cd frontend
npm install
npm run dev
# → http://localhost:5173

# Backend (biofield compute API)
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Desktop (Tauri)
cd frontend
npm run tauri:dev
```

### Build

```bash
# Web build
cd frontend && npm run build

# Desktop build (macOS)
cd frontend && npm run tauri:build
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript 5.9, Tailwind CSS, Framer Motion |
| Desktop | Tauri 2 (Rust shell), WebGL2 shaders |
| Biofield Compute | Python FastAPI, OpenCV, NumPy, SciPy, MediaPipe, TensorFlow.js |
| Rust Compute | Tauri IPC → native metrics calculation |
| Database | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Vision | MediaPipe body/face segmentation, TensorFlow.js |

---

## Project Structure

```
fmrl/
├── frontend/           # React 19 + Vite web app
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── services/   # ComputeRouter, PIPRenderer, MetricsCalculator
│   │   ├── hooks/      # useRealTimeMetrics, useCamera, useSegmentation
│   │   ├── pages/      # Dashboard, Settings, Analysis, Account
│   │   └── context/    # AppContext, AuthContext
│   └── src-tauri/      # Tauri 2 Rust backend + config
├── backend/            # Python FastAPI biofield compute
│   ├── api/routes/     # REST + WebSocket endpoints
│   ├── core/           # Metrics, scores, segmentation, entrainment
│   └── db/             # Supabase repositories
├── supabase/           # Migrations + config
├── docs/               # Design specs + deployment guides
└── .plan/              # Phase-based development plan
```

---

## Documentation

- [Selemene Integration Spec](./docs/design/selemene-integration-spec.md)
- [PIP Analysis System](./PIP_Analysis_System_Specification.md)
- [Camera Calibration Spec](./docs/design/camera-calibration-spec.md)
- [Audio Entrainment Spec](./docs/design/audio-entrainment-spec.md)
- [macOS Release Guide](./docs/deployment/tauri-macos-release.md)

---

## Roadmap

See [`.plan/MASTER-PLAN.md`](./.plan/MASTER-PLAN.md) for the full phased plan.

- [x] **Phase 0** — Foundation & cleanup
- [ ] **Phase 1** — Multi-engine architecture (SelemeneClient, auth bridge, engine routing)
- [ ] **Phase 2** — Timing engines (Panchanga, Vedic Clock, Biorhythm, Numerology)
- [ ] **Phase 3** — Profile engines (Human Design, Gene Keys)
- [ ] **Phase 4** — Workflows & synthesis views
- [ ] **Phase 5** — Platform expansion (watchOS, widgets, menu bar)
- [ ] **Phase 6** — Production & polish (CI/CD, testing, App Store)

---

## License

Proprietary — All rights reserved.

---

<p align="center">
  <em>Part of <a href="https://tryambakam.space">Tryambakam Noesis</a> — a living inquiry field where success means you outgrow the system.</em>
</p>
