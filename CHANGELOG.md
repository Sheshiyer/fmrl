# Changelog

All notable changes to the FMRL (Frequency Modulated Reality Lens) project.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.0.1] - 2026-03-18

### Added — Initial Release

#### Web Application (`@fmrl/web`)
- Real-time video capture with WebRTC
- PIP (Polycontrast Interference Photography) shader visualization using WebGL2
- TouchDesigner-style Noise TOP implementation with video-driven coordinates
- Live biofield metric extraction and display
- Interactive dashboard with Recharts visualizations
- Session management and capture history
- PDF/CSV export functionality
- Discord OAuth integration via Supabase Auth
- Responsive design with Tailwind CSS v4

#### Backend API (`fmrl-api`)
- FastAPI-based REST API with WebSocket support
- Real-time video analysis pipeline (OpenCV + NumPy + SciPy)
- PIP metric calculations:
  - Energy distribution scoring
  - Symmetry analysis (left/right balance)
  - Coherence measurement
  - Complexity indices
  - Regulation metrics
  - Color balance analysis
- Audio entrainment generation (sounddevice + soundfile)
- Baseline establishment and tracking
- Timeline and snapshot persistence
- Export services (PDF reports, CSV data)

#### Desktop Application (`fmrl-desktop`)
- Tauri v2 native macOS application
- Camera and microphone permissions
- File system access for exports
- Local backend integration (localhost:8000)
- Native window controls and menus
- Code-signed and notarization-ready configuration

#### Infrastructure
- Docker containerization (dev + production)
- GitHub Actions CI/CD pipeline
- DigitalOcean deployment automation
- Domain: `fmrl.tryambakam.space`
- Supabase integration (PostgreSQL + Auth + Storage)

#### Documentation
- Comprehensive README with architecture overview
- Deployment guides for web and desktop
- Technical specification documents
- API documentation (inline FastAPI)

### Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript 5.9, Vite 7 |
| Styling | Tailwind CSS 4, Framer Motion |
| Vision | TensorFlow.js, MediaPipe, WebGL2 |
| Backend | Python 3.11, FastAPI, OpenCV |
| Desktop | Tauri v2, Rust |
| Database | Supabase (PostgreSQL), Redis |
| Deploy | Docker, GitHub Actions, DigitalOcean |

### Notes

This is the first public release of FMRL (Frequency Modulated Reality Lens), previously developed under the working name "Biofield Engine" / "Selemene Engine". The system represents a complete rewrite and consolidation of earlier PIP analysis prototypes into a unified web + API + desktop platform.

---

## Pre-Release History

Prior to v0.0.1, development occurred in the `biofield-engine` repository under various internal codenames. Key milestones included:

- TouchDesigner Noise TOP shader reverse-engineering
- WebGL2 PIP visualization prototypes
- TensorFlow.js body segmentation integration
- MediaPipe face landmark detection
- Early FastAPI analysis backend

These components have been consolidated into the unified FMRL platform as of v0.0.1.

---

[0.0.1]: https://github.com/witnessalchemist/fmrl/releases/tag/v0.0.1
