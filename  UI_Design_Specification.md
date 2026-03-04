## PIP Analysis Frontend – Glassmorphic UI Spec

### 1. Visual Style
- **Theme**: Dark, high-contrast base (`#05060A` to `#111827` gradient) with glass panels.
- **Glass Panels**:
  - Background: white/indigo at 6–10% opacity (`rgba(255,255,255,0.06)` / `rgba(79,70,229,0.12)`).
  - Blur: `backdrop-filter: blur(18–24px)`.
  - Borders: 1px solid with inner highlight (`rgba(255,255,255,0.25)`) + outer hairline stroke (`rgba(15,23,42,0.8)`).
  - Corners: 16–20px radius.
- **Lighting**: Soft top accent glow behind main canvas (radial gradient, low opacity);
  subtle colored glows behind high scores (green/cyan) and low scores (amber/red).
- **Typography**: Modern sans (e.g. Inter, SF Pro). Title 24–28px semibold; body 13–14px medium.
- **Iconography**: Line icons (Lucide) at 16–20px with muted colors by default; brighter on hover.

### 2. Layout

**2.1 Shell**
- **Header (glass bar, 64px height)**
  - Left: App title `PIP Analysis`, mini waveform icon, subtitle `Polycontrast Interference Photography`.
  - Center: Session status pill (`Offline / Live`) with pulsing indicator dot.
  - Right: Icon buttons in a glass chip row: **Capture history**, **Export**, **Settings**, **Profile**.

- **Main Area** – 2-column layout with fixed bottom timeline:
  - **Left (≈60%) – PIP Canvas Panel**
    - Large glass card containing:
      - Video/PIP canvas at top with 16:10 ratio, rounded corners.
      - Overlay badges in top-left: FPS, resolution, current mode (Full Body / Face / Segmented).
      - Bottom row: primary controls as pill buttons: `Capture`, `Pause/Resume`, `Mode`, `Overlay`.
      - Small, semi-transparent zone legend (Body / Proximal / Distal / Background) in bottom-right.
  - **Right (≈40%) – Metrics & Scores Column**
    - Stacked glass cards, scrollable if needed:
      - **Composite Scores Card**: 3×2 grid of score tiles (Energy, Symmetry, Coherence, Complexity, Regulation, Color Balance).
      - **Live Metrics Card**: compact list of key raw metrics with tiny sparklines (LQD, Avg Intensity, Inner Noise, Fractal Dim, Hurst, etc.).
      - **Symmetry Snapshot Card**: inner vs outer symmetry bars with left/right indicators.

- **Bottom – Timeline Strip (glass dock, 120–160px height)**
  - Time-series chart for key scores over the last N minutes.
  - Metric toggles (pills) to show/hide lines.
  - Capture markers on the timeline; clicking jumps to snapshot.

### 3. Core Components

- **Score Tile (glass chip)**
  - Title + numeric score (0–100) + colored progress ring or bar.
  - Trend indicator (▲▼▬) using last 30–60s.
  - Sub-label: short natural-language interpretation (e.g. `Good symmetry`).

- **Capture Modal**
  - Full-screen overlay with glass background blur.
  - **Layout**: Split view (60/40) on desktop, stacked on mobile.
  - **Left Panel - Captured Frame**:
    - Enlarged PIP image with 16:10 aspect ratio.
    - Overlay controls: zoom, pan, zone toggle.
    - Timestamp and capture settings badge.
  - **Right Panel - Analysis Tabs**:
    - `Overview`: All 6 composite scores with trend arrows, session notes textarea, export options.
    - `Zones`: Per-zone breakdown (Body, Proximal, Distal, Background) with bar charts and heatmaps.
    - `Symmetry`: Inner/outer symmetry visualization with left/right comparison bars.
    - `Advanced`: Nonlinear dynamics metrics (Fractal Dim, Hurst, Lyapunov) with mini charts.
  - **Footer**: Save/Export buttons, Compare with baseline, Delete option.

- **Detailed Analysis Page**
  - Full-page view for deep dive into captured session.
  - **Header**: Glass bar with breadcrumb navigation, session info, share/export options.
  - **Main Layout**: 3-column responsive grid.
    - **Left (40%) - Visual Analysis**:
      - Large PIP image viewer with zoom/pan.
      - Zone segmentation overlay toggle.
      - Heatmap visualization for energy distribution.
      - Before/after comparison slider.
    - **Center (35%) - Metrics Explorer**:
      - Composite scores with sparkline history.
      - Raw metrics table with sortable columns.
      - Correlation matrix visualization.
      - Statistical summary cards.
    - **Right (25%) - Insights & Actions**:
      - AI-generated insights glass card.
      - Recommendations based on scores.
      - Session notes with rich text editor.
      - Export options (PDF, CSV, JSON).
  - **Bottom Section**: 
    - Timeline with all capture points.
    - Detailed chart view for selected metrics.
    - Baseline comparison view.

- **Settings Drawer (right-side slide-over)**
  - Sections: `Camera`, `Analysis`, `Baseline`, `Export`.
  - Each section in its own small glass card group.

### 4. Interaction & Micro-Animations
- Hover: elevate glass cards slightly (`transform: translateY(-2px)`, subtle shadow, border brighten).
- Buttons: 150–200ms ease-out background/outline transition; ripple or glow on click.
- Scores: animated number tween on change; progress bars smoothly interpolate.
- Theme: persistent dark glass; no full theme switch for now, only `Density` toggle (compact vs spacious).

### 5. Responsiveness
- **≥1440px**: Full two-column layout + timeline. Capture modal uses 60/40 split. Analysis page uses 3-column grid.
- **1024–1439px**: Right column collapses into tabs above the timeline. Capture modal stacks vertically. Analysis page uses 2-column layout.
- **≤768px**: Single column; canvas on top, scores below, timeline collapses to mini-chart. Capture modal fully stacked. Analysis page uses single column with collapsible sections.

### 6. Screen Flow & Navigation
- **Main Dashboard** → **Capture Modal** (triggered by Capture button)
  - Modal can be dismissed or proceed to detailed analysis
- **Capture Modal** → **Detailed Analysis Page** (via "Analyze in Detail" button)
- **Timeline** → **Detailed Analysis Page** (clicking capture markers)
- **Header** → **Settings Drawer** (slide-over overlay)
- **Export Options**: Available from Capture Modal, Detailed Analysis, and Settings

### 7. Data Visualization Elements
- **Progress Rings**: Circular progress for composite scores (0-100)
- **Sparklines**: Mini line charts showing 30-60s trends
- **Heatmaps**: Zone-based energy distribution visualization
- **Bar Charts**: Per-zone metric comparisons
- **Correlation Matrix**: Interactive grid showing metric relationships
- **Timeline Charts**: Multi-metric time-series with toggle controls

