# PIP Quantitative Analysis System
## Technical Specification Document

**Version:** 1.0  
**Date:** December 2024  
**Purpose:** Web application for real-time and static analysis of Polycontrast Interference Photography (PIP) images

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Frontend Specification](#3-frontend-specification)
4. [Backend Specification](#4-backend-specification)
5. [Metric Definitions](#5-metric-definitions)
6. [Composite Score Calculations](#6-composite-score-calculations)
7. [Data Flow & Processing Pipeline](#7-data-flow--processing-pipeline)
8. [API Specification](#8-api-specification)
9. [Database Schema](#9-database-schema)
10. [Audio-Visual Entrainment Integration](#10-audio-visual-entrainment-integration)
11. [Calibration & Normalization](#11-calibration--normalization)
12. [Testing Requirements](#12-testing-requirements)
13. [Implementation Phases](#13-implementation-phases)

---

## 1. Executive Summary

### 1.1 Project Overview

This system provides quantitative analysis of Polycontrast Interference Photography (PIP) images and video streams, similar to the Bio-Well GDV/EPI analysis system. The application captures webcam/iPhone camera feeds, applies PIP visualization processing, and calculates biofield metrics in real-time.

### 1.2 Core Objectives

- Real-time video analysis with live metric display
- Detailed static image analysis on capture
- Composite scoring system (Energy, Symmetry, Coherence, Complexity, Regulation, Color Balance)
- Baseline establishment and tracking over time
- Audio-visual entrainment output based on metrics
- Research data export capabilities

### 1.3 Target Users

- Wellness practitioners
- Researchers studying biofield phenomena
- Individuals tracking personal wellness metrics

### 1.4 Input Sources

- iPhone camera (via browser or companion app)
- Mac webcam
- Pre-recorded video files
- Static images for batch analysis

### 1.5 Analysis Modes

| Mode | Region | Use Case |
|------|--------|----------|
| Full Body | Entire frame | Overall biofield assessment |
| Face Only | Face detection ROI | Facial energy mapping |
| Segmented | Anatomical regions | Detailed organ/chakra analysis |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Video Input  │──│ PIP Shader   │──│  Real-Time Metrics       │  │
│  │  (WebRTC)     │  │ (WebGL2)     │  │  Extraction (JS/WASM)    │  │
│  └───────────────┘  └──────────────┘  └───────────┬──────────────┘  │
│                                                    │                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    React UI Dashboard                         │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │   │
│  │  │ Video Panel │ │ Score Cards │ │ Real-Time Charts        │ │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ WebSocket / REST API
┌────────────────────────────────┴────────────────────────────────────┐
│                         SERVER (Python)                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  FastAPI Server  │  │  Analysis Engine │  │  Data Storage    │   │
│  │  - REST API      │  │  - OpenCV        │  │  - PostgreSQL    │   │
│  │  - WebSocket     │  │  - NumPy/SciPy   │  │  - Redis Cache   │   │
│  │  - Auth          │  │  - scikit-image  │  │  - File Storage  │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

**Frontend:**
- React 18+ with TypeScript
- WebGL2 for PIP shader rendering
- **MediaPipe Selfie Segmentation** for body/background separation (TensorFlow.js)
- **MediaPipe Face Mesh** for facial landmark detection (TensorFlow.js)
- Chart.js or Recharts for real-time graphs
- Web Workers for parallel metric computation
- WebRTC for camera access

**Backend:**
- Python 3.11+
- FastAPI for REST/WebSocket API
- **MediaPipe** for segmentation (same as frontend, ensures consistency)
- OpenCV for image processing and zone creation
- NumPy, SciPy for numerical analysis
- scikit-image for image metrics
- nolds library for nonlinear dynamics
- PostgreSQL for persistent storage
- Redis for real-time caching

**IMPORTANT - Segmentation Technology Decision:**
MediaPipe is the MANDATORY choice for all segmentation tasks. Do NOT use SAM (Segment Anything Model), SAM 2, SAM 3, or any GPU-heavy segmentation models. See `PIP_Segmentation_Specification.md` Section 2 for detailed rationale.

### 2.3 Processing Distribution

| Computation | Location | Rationale |
|-------------|----------|-----------|
| PIP Shader | Frontend (WebGL) | GPU-accelerated, existing implementation |
| **Body/Face Segmentation** | **Frontend (MediaPipe/TF.js)** | **Real-time, no server round-trip** |
| Real-time metrics | Frontend (WASM/JS) | Low latency requirement |
| Zone creation | Frontend (Canvas/OpenCV.js) | Simple morphological ops |
| Detailed analysis | Backend (Python) | Complex algorithms, library availability |
| Historical analysis | Backend (Python) | Database access, batch processing |

---

## 3. Frontend Specification

### 3.1 Layout Structure

```
┌────────────────────────────────────────────────────────────────────┐
│  Header: Logo | User Profile | Settings | Export                   │
├────────────────────────────────────────────────────────────────────┤
│                                    │                                │
│                                    │   ┌────────────────────────┐  │
│                                    │   │  ENERGY SCORE          │  │
│                                    │   │  ████████████░░░  78   │  │
│     ┌──────────────────────────┐   │   └────────────────────────┘  │
│     │                          │   │   ┌────────────────────────┐  │
│     │                          │   │   │  SYMMETRY SCORE        │  │
│     │     PIP VIDEO FEED       │   │   │  ██████████████░░  85  │  │
│     │     (640x480 default)    │   │   └────────────────────────┘  │
│     │                          │   │   ┌────────────────────────┐  │
│     │                          │   │   │  COHERENCE SCORE       │  │
│     │                          │   │   │  ████████░░░░░░░  62   │  │
│     └──────────────────────────┘   │   └────────────────────────┘  │
│                                    │   ┌────────────────────────┐  │
│     [📷 Capture] [⏸ Pause]        │   │  COMPLEXITY SCORE      │  │
│     [⚙️ Settings] [📊 History]    │   │  ██████████░░░░░  71   │  │
│                                    │   └────────────────────────┘  │
│                                    │   ┌────────────────────────┐  │
│                                    │   │  REGULATION SCORE      │  │
│                                    │   │  ████████████░░░  76   │  │
│                                    │   └────────────────────────┘  │
│                                    │   ┌────────────────────────┐  │
│                                    │   │  COLOR BALANCE         │  │
│                                    │   │  ████████████████  92  │  │
│                                    │   └────────────────────────┘  │
├────────────────────────────────────┴───────────────────────────────┤
│                     Real-Time Metrics Graph                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~      │   │
│  │    Energy  ── Coherence  ─·─ Symmetry                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Hierarchy

```
App
├── Header
│   ├── Logo
│   ├── UserProfile
│   ├── SettingsButton
│   └── ExportButton
├── MainContent
│   ├── VideoPanel
│   │   ├── PIPCanvas (WebGL2)
│   │   ├── VideoControls
│   │   │   ├── CaptureButton
│   │   │   ├── PauseButton
│   │   │   ├── SettingsButton
│   │   │   └── HistoryButton
│   │   └── PIPControlPanel (collapsible)
│   │       ├── NoiseParameters
│   │       ├── AnimationControls
│   │       ├── BlendSettings
│   │       └── EffectSettings
│   └── MetricsPanel
│       ├── ScoreCard (x6)
│       │   ├── ScoreTitle
│       │   ├── ProgressBar
│       │   ├── NumericValue
│       │   └── TrendIndicator
│       └── MetricDetails (expandable)
├── GraphPanel
│   ├── TimeSeriesChart
│   ├── TimeRangeSelector
│   └── MetricToggle
├── CaptureModal
│   ├── CapturedImage
│   ├── DetailedMetrics
│   ├── SegmentedAnalysis
│   └── SaveOptions
└── SettingsModal
    ├── CameraSettings
    ├── AnalysisSettings
    ├── BaselineSettings
    └── ExportSettings
```

### 3.3 State Management

**Global State (Context/Redux):**
```typescript
interface AppState {
  // Video State
  videoStream: MediaStream | null;
  isPlaying: boolean;
  isPaused: boolean;
  
  // PIP Parameters
  pipSettings: PIPSettings;
  
  // Real-Time Metrics
  currentMetrics: RealTimeMetrics;
  metricsHistory: MetricsHistoryEntry[];
  
  // Scores
  compositeScores: CompositeScores;
  
  // Baseline
  baseline: BaselineData | null;
  
  // UI State
  selectedAnalysisMode: 'fullBody' | 'face' | 'segmented';
  isCapturing: boolean;
  showSettings: boolean;
}

interface PIPSettings {
  seed: number;
  period: number;
  harmonics: number;
  spread: number;
  gain: number;
  roughness: number;
  exponent: number;
  amplitude: number;
  offset: number;
  speed: number;
  intensity: number;
  videoInfluence: number;
  colorSaturation: number;
  hueShift: number;
  blurAmount: number;
}

interface RealTimeMetrics {
  timestamp: number;
  avgIntensity: number;
  lightQuantaDensity: number;
  normalizedArea: number;
  innerNoise: number;
  symmetryIndex: number;
  colorDistribution: ColorDistribution;
  frameVariance: number;
}

interface CompositeScores {
  energy: number;
  symmetry: number;
  coherence: number;
  complexity: number;
  regulation: number;
  colorBalance: number;
}
```

### 3.4 Real-Time Metric Extraction (Frontend)

The frontend should extract these metrics at 10-15 FPS for real-time display:

```typescript
// Metrics computed per frame in Web Worker
interface FrameMetrics {
  // Basic Intensity Metrics
  avgIntensity: number;          // Mean pixel intensity
  intensityStdDev: number;       // Standard deviation
  maxIntensity: number;          // Peak value
  minIntensity: number;          // Minimum value
  
  // Area Metrics
  lightQuantaDensity: number;    // Pixels above threshold / total pixels
  normalizedArea: number;        // Active area ratio
  
  // Noise Metrics
  innerNoise: number;            // Variance within ROI
  innerNoisePercent: number;     // Noise as percentage
  
  // Symmetry (quick calculation)
  horizontalSymmetry: number;    // Left/right correlation
  verticalSymmetry: number;      // Top/bottom correlation
  
  // Color Metrics
  dominantHue: number;           // Most frequent hue (0-360)
  saturationMean: number;        // Average saturation
  colorEntropy: number;          // Color distribution entropy
  
  // Temporal Metrics (requires buffer)
  frameToFrameChange: number;    // Difference from previous frame
  motionEnergy: number;          // Accumulated motion
}
```

### 3.5 WebGL Shader Integration

The existing PIP shader must be modified to:

1. **Output to offscreen canvas** for metric extraction
2. **Expose uniform controls** via JavaScript API
3. **Support frame capture** at full resolution

```javascript
// PIPRenderer class interface
class PIPRenderer {
  constructor(canvas: HTMLCanvasElement);
  
  // Lifecycle
  init(): Promise<void>;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  
  // Settings
  setParameter(name: string, value: number): void;
  getParameters(): PIPSettings;
  loadPreset(preset: PIPPreset): void;
  
  // Frame Access
  captureFrame(): ImageData;
  getPixelData(): Uint8Array;
  
  // Events
  onFrame(callback: (frameData: FrameData) => void): void;
}
```

---

## 4. Backend Specification

### 4.1 Server Architecture

```
backend/
├── main.py                     # FastAPI application entry
├── config.py                   # Configuration management
├── requirements.txt            # Python dependencies
│
├── api/
│   ├── __init__.py
│   ├── routes/
│   │   ├── analysis.py         # Analysis endpoints
│   │   ├── capture.py          # Image capture endpoints
│   │   ├── history.py          # Historical data endpoints
│   │   ├── baseline.py         # Baseline management
│   │   ├── export.py           # Data export endpoints
│   │   └── websocket.py        # Real-time WebSocket handler
│   └── dependencies.py         # Shared dependencies
│
├── core/
│   ├── __init__.py
│   ├── metrics/
│   │   ├── basic.py            # Basic metrics (intensity, area, noise)
│   │   ├── geometric.py        # Contour, shape metrics
│   │   ├── nonlinear.py        # Fractal, Hurst, Lyapunov
│   │   ├── color.py            # Color analysis metrics
│   │   ├── symmetry.py         # Symmetry analysis
│   │   └── temporal.py         # Time-series metrics
│   │
│   ├── scores/
│   │   ├── energy.py           # Energy score calculation
│   │   ├── symmetry.py         # Symmetry score calculation
│   │   ├── coherence.py        # Coherence score calculation
│   │   ├── complexity.py       # Complexity score calculation
│   │   ├── regulation.py       # Regulation score calculation
│   │   └── color_balance.py    # Color balance score calculation
│   │
│   ├── segmentation/
│   │   ├── body.py             # Full body segmentation
│   │   ├── face.py             # Face region detection
│   │   └── anatomical.py       # Anatomical region mapping
│   │
│   └── entrainment/
│       ├── audio.py            # Audio generation based on metrics
│       └── visual.py           # Visual feedback patterns
│
├── models/
│   ├── __init__.py
│   ├── metrics.py              # Metric data models
│   ├── analysis.py             # Analysis result models
│   ├── user.py                 # User models
│   └── session.py              # Session models
│
├── db/
│   ├── __init__.py
│   ├── database.py             # Database connection
│   ├── repositories/
│   │   ├── analysis.py         # Analysis data repository
│   │   ├── baseline.py         # Baseline repository
│   │   └── user.py             # User repository
│   └── migrations/             # Database migrations
│
└── utils/
    ├── __init__.py
    ├── image_processing.py     # Image utility functions
    ├── normalization.py        # Metric normalization
    └── statistics.py           # Statistical utilities
```

### 4.2 Dependencies (requirements.txt)

```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
python-multipart>=0.0.6
websockets>=12.0
pydantic>=2.5.0

# Image Processing
opencv-python>=4.8.0
numpy>=1.26.0
scipy>=1.11.0
scikit-image>=0.22.0
Pillow>=10.1.0

# Nonlinear Dynamics
nolds>=0.5.2
antropy>=0.1.6

# Database
sqlalchemy>=2.0.0
asyncpg>=0.29.0
alembic>=1.12.0
redis>=5.0.0

# Data Processing
pandas>=2.1.0

# Audio Generation (for entrainment)
sounddevice>=0.4.6
soundfile>=0.12.1

# Utilities
python-dotenv>=1.0.0
httpx>=0.25.0
```

---

## 5. Metric Definitions

### 5.1 Basic Metrics (Real-Time Capable)

#### 5.1.1 Light Quanta Density (LQD)

**Definition:** Ratio of pixels above intensity threshold to total pixels in ROI

**Formula:**
```
LQD = count(pixels > threshold) / total_pixels
```

**Parameters:**
- `threshold`: Adaptive threshold based on image histogram (default: mean + 0.5 * std)

**Interpretation:**
- Range: 0.0 - 1.0
- Higher values indicate more intense energy emission
- Baseline-relative changes significant at ±10%

**Implementation Notes:**
- Frontend: Direct pixel counting from ImageData
- Backend: `cv2.threshold()` + `np.count_nonzero()`

---

#### 5.1.2 Average Intensity

**Definition:** Mean pixel intensity across ROI

**Formula:**
```
I_avg = Σ(pixel_values) / n_pixels
```

**Per-channel variant:**
```
I_avg_rgb = [mean(R), mean(G), mean(B)]
```

**Interpretation:**
- Range: 0 - 255 (8-bit)
- Indicates overall brightness/energy level
- Compare against baseline for significance

---

#### 5.1.3 Normalized Area

**Definition:** Ratio of active (above-threshold) area to reference area

**Formula:**
```
NA = area_active / area_reference
```

**Calculation:**
```python
def normalized_area(image, threshold, reference_area):
    binary = image > threshold
    active_area = np.sum(binary)
    return active_area / reference_area
```

**Interpretation:**
- Range: 0.0 - 2.0+ (can exceed 1.0)
- Values > 1.0 indicate expansion beyond reference
- Useful for comparing regions or sessions

---

#### 5.1.4 Inner Noise

**Definition:** Variability/fluctuation of pixel intensities within ROI

**Formula:**
```
IN = std(pixels_in_ROI)
IN% = (std / mean) * 100
```

**Implementation:**
```python
def inner_noise(roi):
    noise = np.std(roi)
    noise_percent = (noise / np.mean(roi)) * 100 if np.mean(roi) > 0 else 0
    return noise, noise_percent
```

**Interpretation:**
- Higher noise suggests instability or chaotic processes
- Lower noise indicates coherent, stable emission
- Normal range: 15-30% (baseline dependent)

---

### 5.2 Geometric Metrics

#### 5.2.1 Contour Analysis

**Metrics:**
- Inner contour length
- Inner contour radius
- Outer contour length
- Outer contour radius
- Ellipse dimensions (major/minor axis)

**Implementation:**
```python
def contour_metrics(binary_image):
    contours, _ = cv2.findContours(binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return None
    
    largest_contour = max(contours, key=cv2.contourArea)
    
    # Basic metrics
    area = cv2.contourArea(largest_contour)
    perimeter = cv2.arcLength(largest_contour, True)
    
    # Fit ellipse
    if len(largest_contour) >= 5:
        ellipse = cv2.fitEllipse(largest_contour)
        center, axes, angle = ellipse
        
    # Equivalent radius
    radius = np.sqrt(area / np.pi)
    
    return {
        'area': area,
        'perimeter': perimeter,
        'inner_contour_length': perimeter,
        'inner_contour_radius': radius,
        'ellipse_major': max(axes),
        'ellipse_minor': min(axes)
    }
```

---

#### 5.2.2 Entropy Coefficient (EC)

**Definition:** Measure of contour irregularity/complexity

**Formula:**
```
EC = perimeter / (2 * sqrt(π * area))
```

**Interpretation:**
- EC = 1.0 for perfect circle
- EC > 1.0 indicates irregular boundary
- Higher values suggest turbulent energy flows

---

#### 5.2.3 Form Coefficient (FC)

**Definition:** Relationship between contour length and enclosed area

**Formula:**
```
FC = perimeter² / (4π * area)
```

**Interpretation:**
- FC = 1.0 for perfect circle
- FC > 1.0 indicates complex/elongated shape
- Related to energy field distribution pattern

---

### 5.3 Nonlinear Dynamics Metrics (Backend Only)

#### 5.3.1 Fractal Dimension

**Definition:** Measure of spatial complexity and self-similarity

**Method:** Box-counting dimension

**Implementation:**
```python
from skimage.measure import shannon_entropy
import numpy as np

def fractal_dimension_boxcount(binary_image, threshold=0.5):
    """
    Calculate fractal dimension using box-counting method.
    """
    def boxcount(Z, k):
        S = np.add.reduceat(
            np.add.reduceat(Z, np.arange(0, Z.shape[0], k), axis=0),
            np.arange(0, Z.shape[1], k), axis=1)
        return len(np.where((S > 0) & (S < k*k))[0])
    
    Z = (binary_image > threshold)
    p = min(Z.shape)
    n = 2**np.floor(np.log(p)/np.log(2))
    n = int(np.log(n)/np.log(2))
    
    sizes = 2**np.arange(n, 1, -1)
    counts = [boxcount(Z, size) for size in sizes]
    
    coeffs = np.polyfit(np.log(sizes), np.log(counts), 1)
    return -coeffs[0]
```

**Interpretation:**
- Range: 1.0 - 2.0 for 2D images
- Higher values indicate more complex, space-filling patterns
- Values near 1.5-1.7 common for natural biological patterns

---

#### 5.3.2 Hurst Exponent

**Definition:** Characterizes long-term memory in time series or spatial correlations

**Method:** Rescaled range (R/S) analysis or DFA

**Implementation:**
```python
import nolds

def hurst_exponent(time_series):
    """
    Calculate Hurst exponent using R/S analysis.
    """
    return nolds.hurst_rs(time_series)

def hurst_from_image(image):
    """
    Calculate Hurst exponent from image intensity profile.
    """
    # Use horizontal or vertical intensity profile
    profile = np.mean(image, axis=0)
    return nolds.hurst_rs(profile)
```

**Interpretation:**
- H < 0.5: Anti-persistent (mean-reverting)
- H = 0.5: Random walk (uncorrelated)
- H > 0.5: Persistent (trending, long-term correlations)
- H near 1.0: Strong long-term memory, coherent dynamics

---

#### 5.3.3 Lyapunov Exponent

**Definition:** Rate of divergence of nearby trajectories in phase space

**Implementation:**
```python
import nolds

def lyapunov_exponent(time_series, emb_dim=10):
    """
    Calculate largest Lyapunov exponent.
    """
    return nolds.lyap_r(time_series, emb_dim=emb_dim)
```

**Interpretation:**
- λ < 0: Stable, convergent dynamics
- λ = 0: Marginally stable
- λ > 0: Chaotic, divergent dynamics
- Higher positive values indicate more chaos

---

#### 5.3.4 Correlation Dimension

**Definition:** Fractal dimension of attractor in phase space

**Implementation:**
```python
import nolds

def correlation_dimension(time_series, emb_dim=10):
    """
    Estimate correlation dimension.
    """
    return nolds.corr_dim(time_series, emb_dim=emb_dim)
```

**Interpretation:**
- Fractional values suggest complex, nonlinear dynamics
- Integer values suggest linear dynamics
- Lower values indicate simpler underlying structure

---

#### 5.3.5 Detrended Fluctuation Analysis (DFA)

**Definition:** Detects long-range correlations in non-stationary time series

**Implementation:**
```python
import nolds

def dfa_alpha(time_series):
    """
    Calculate DFA scaling exponent.
    """
    return nolds.dfa(time_series)
```

**Interpretation:**
- α < 0.5: Anti-correlated
- α = 0.5: White noise (uncorrelated)
- α = 1.0: 1/f noise (pink noise)
- α > 1.0: Non-stationary, stronger correlations
- α = 1.5: Brownian noise

---

### 5.4 Color Metrics

#### 5.4.1 Color Distribution Analysis

**Definition:** Statistical distribution of colors across the image

**Implementation:**
```python
def color_distribution(image_rgb):
    """
    Analyze color distribution in HSV space.
    """
    hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
    
    # Hue histogram (0-180 in OpenCV)
    hue_hist = cv2.calcHist([hsv], [0], None, [180], [0, 180])
    hue_hist = hue_hist.flatten() / hue_hist.sum()
    
    # Saturation histogram
    sat_hist = cv2.calcHist([hsv], [1], None, [256], [0, 256])
    sat_hist = sat_hist.flatten() / sat_hist.sum()
    
    # Value histogram
    val_hist = cv2.calcHist([hsv], [2], None, [256], [0, 256])
    val_hist = val_hist.flatten() / val_hist.sum()
    
    return {
        'hue_distribution': hue_hist,
        'saturation_distribution': sat_hist,
        'value_distribution': val_hist,
        'dominant_hue': np.argmax(hue_hist) * 2,  # Convert to 0-360
        'mean_saturation': np.average(range(256), weights=sat_hist),
        'mean_value': np.average(range(256), weights=val_hist)
    }
```

---

#### 5.4.2 Color Entropy

**Definition:** Measure of color randomness/complexity

**Implementation:**
```python
from scipy.stats import entropy

def color_entropy(image_rgb):
    """
    Calculate Shannon entropy of color distribution.
    """
    hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
    
    # Combined HSV histogram
    hist = cv2.calcHist([hsv], [0, 1, 2], None, 
                        [30, 32, 32], [0, 180, 0, 256, 0, 256])
    hist = hist.flatten()
    hist = hist / hist.sum()
    hist = hist[hist > 0]  # Remove zeros for entropy calculation
    
    return entropy(hist, base=2)
```

**Interpretation:**
- Higher entropy: More diverse, complex color patterns
- Lower entropy: More uniform, homogeneous coloring
- Typical range: 3.0 - 8.0 bits

---

#### 5.4.3 Color Coherence

**Definition:** Spatial organization and consistency of colors

**Implementation:**
```python
def color_coherence(image_rgb, threshold=25):
    """
    Calculate color coherence using connected components.
    """
    hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
    
    # Quantize hue to major color bands
    hue_quantized = (hsv[:,:,0] // 30) * 30
    
    coherent_pixels = 0
    total_pixels = image_rgb.shape[0] * image_rgb.shape[1]
    
    for hue_val in range(0, 180, 30):
        mask = (hue_quantized == hue_val).astype(np.uint8)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask)
        
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            if area > threshold:
                coherent_pixels += area
    
    return coherent_pixels / total_pixels
```

---

#### 5.4.4 Color Symmetry

**Definition:** Similarity of color distribution between left/right halves

**Implementation:**
```python
def color_symmetry(image_rgb):
    """
    Calculate color symmetry between left and right halves.
    """
    h, w = image_rgb.shape[:2]
    mid = w // 2
    
    left = image_rgb[:, :mid]
    right = np.fliplr(image_rgb[:, mid:2*mid])
    
    # Compare histograms
    left_hsv = cv2.cvtColor(left, cv2.COLOR_RGB2HSV)
    right_hsv = cv2.cvtColor(right, cv2.COLOR_RGB2HSV)
    
    left_hist = cv2.calcHist([left_hsv], [0, 1], None, [30, 32], [0, 180, 0, 256])
    right_hist = cv2.calcHist([right_hsv], [0, 1], None, [30, 32], [0, 180, 0, 256])
    
    # Normalize
    left_hist = cv2.normalize(left_hist, left_hist).flatten()
    right_hist = cv2.normalize(right_hist, right_hist).flatten()
    
    # Compare using correlation
    return cv2.compareHist(left_hist, right_hist, cv2.HISTCMP_CORREL)
```

---

### 5.5 Symmetry Metrics

#### 5.5.1 Body Symmetry Analysis

**Implementation:**
```python
def body_symmetry(image, axis='vertical'):
    """
    Calculate bilateral symmetry score.
    """
    h, w = image.shape[:2]
    
    if axis == 'vertical':
        mid = w // 2
        left = image[:, :mid]
        right = np.fliplr(image[:, mid:2*mid])
    else:
        mid = h // 2
        top = image[:mid, :]
        bottom = np.flipud(image[mid:2*mid, :])
        left, right = top, bottom
    
    # Ensure same size
    min_size = min(left.shape[1], right.shape[1])
    left = left[:, :min_size]
    right = right[:, :min_size]
    
    # Calculate correlation
    correlation = np.corrcoef(left.flatten(), right.flatten())[0, 1]
    
    # Calculate structural similarity
    from skimage.metrics import structural_similarity as ssim
    ssim_score = ssim(left, right, data_range=255)
    
    return {
        'correlation': correlation,
        'ssim': ssim_score,
        'combined': (correlation + ssim_score) / 2
    }
```

---

#### 5.5.2 Segmented Contour Complexity

**Implementation:**
```python
def contour_complexity(binary_image):
    """
    Calculate contour complexity using fractal dimension of boundary.
    """
    contours, _ = cv2.findContours(binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    
    if not contours:
        return 0
    
    largest = max(contours, key=cv2.contourArea)
    
    # Create contour image
    contour_img = np.zeros(binary_image.shape, dtype=np.uint8)
    cv2.drawContours(contour_img, [largest], -1, 255, 1)
    
    # Calculate fractal dimension of contour
    return fractal_dimension_boxcount(contour_img)
```

---

### 5.6 Pattern Regularity Metrics

#### 5.6.1 Light Pattern Regularity

**Definition:** Uniformity of spacing between light patterns

**Implementation:**
```python
def pattern_regularity(image):
    """
    Assess pattern regularity using autocorrelation.
    """
    # Compute 2D FFT
    f_transform = np.fft.fft2(image)
    f_shift = np.fft.fftshift(f_transform)
    magnitude = np.abs(f_shift)
    
    # Compute autocorrelation
    autocorr = np.fft.ifft2(magnitude ** 2)
    autocorr = np.abs(np.fft.fftshift(autocorr))
    
    # Normalize
    autocorr = autocorr / autocorr.max()
    
    # Find secondary peaks (regularity indicators)
    from scipy.ndimage import maximum_filter
    local_max = maximum_filter(autocorr, size=20)
    peaks = (autocorr == local_max) & (autocorr > 0.3)
    
    peak_count = np.sum(peaks) - 1  # Exclude central peak
    
    # Calculate regularity score based on peak structure
    regularity = min(peak_count / 10, 1.0)  # Normalize to 0-1
    
    return regularity
```

---

### 5.7 Temporal Metrics (Video Analysis)

#### 5.7.1 Frame-to-Frame Stability

**Implementation:**
```python
class TemporalAnalyzer:
    def __init__(self, buffer_size=30):
        self.buffer = []
        self.buffer_size = buffer_size
    
    def add_frame(self, metrics):
        self.buffer.append(metrics)
        if len(self.buffer) > self.buffer_size:
            self.buffer.pop(0)
    
    def get_stability(self, metric_name):
        if len(self.buffer) < 2:
            return 1.0
        
        values = [m[metric_name] for m in self.buffer]
        return 1.0 - (np.std(values) / (np.mean(values) + 1e-6))
    
    def get_trend(self, metric_name):
        if len(self.buffer) < 3:
            return 0
        
        values = [m[metric_name] for m in self.buffer]
        x = np.arange(len(values))
        slope, _ = np.polyfit(x, values, 1)
        return slope
```

---

## 6. Composite Score Calculations

### 6.1 Energy Score

**Components and Weights:**
| Metric | Weight | Notes |
|--------|--------|-------|
| Light Quanta Density | 0.30 | Normalized 0-1 |
| Average Intensity | 0.25 | Normalized to 0-1 scale |
| Energy Analysis | 0.25 | Integrated intensity × area |
| Normalized Area | 0.20 | Capped at 1.5 |

**Formula:**
```python
def calculate_energy_score(metrics, baseline=None):
    """
    Calculate Energy Score (0-100 scale).
    """
    # Normalize inputs
    lqd_norm = min(metrics['light_quanta_density'], 1.0)
    intensity_norm = metrics['avg_intensity'] / 255
    energy_norm = normalize_to_range(metrics['energy_analysis'], baseline, 'energy')
    area_norm = min(metrics['normalized_area'] / 1.5, 1.0)
    
    # Weighted combination
    raw_score = (
        0.30 * lqd_norm +
        0.25 * intensity_norm +
        0.25 * energy_norm +
        0.20 * area_norm
    )
    
    # Scale to 0-100
    return int(raw_score * 100)
```

**Interpretation:**
- 0-30: Low energy emission
- 31-50: Below average energy
- 51-70: Normal/average energy
- 71-85: Above average energy
- 86-100: High energy emission

---

### 6.2 Symmetry Score

**Components and Weights:**
| Metric | Weight | Notes |
|--------|--------|-------|
| Body Symmetry (SSIM) | 0.50 | Structural similarity |
| Contour Complexity Balance | 0.30 | Left/right complexity ratio |
| Color Symmetry | 0.20 | Color distribution similarity |

**Formula:**
```python
def calculate_symmetry_score(metrics):
    """
    Calculate Symmetry Score (0-100 scale).
    """
    # Body symmetry (already 0-1)
    body_sym = metrics['body_symmetry']['combined']
    
    # Contour complexity balance (convert ratio to symmetry)
    left_complexity = metrics['left_contour_complexity']
    right_complexity = metrics['right_contour_complexity']
    complexity_ratio = min(left_complexity, right_complexity) / (max(left_complexity, right_complexity) + 1e-6)
    
    # Color symmetry (already 0-1 from correlation)
    color_sym = max(0, metrics['color_symmetry'])  # Clip negative correlations
    
    # Weighted combination
    raw_score = (
        0.50 * body_sym +
        0.30 * complexity_ratio +
        0.20 * color_sym
    )
    
    return int(raw_score * 100)
```

**Interpretation:**
- 0-40: Significant asymmetry
- 41-60: Moderate asymmetry
- 61-80: Good symmetry
- 81-100: Excellent bilateral balance

---

### 6.3 Coherence Score

**Components and Weights:**
| Metric | Weight | Notes |
|--------|--------|-------|
| Pattern Regularity | 0.35 | Autocorrelation-based |
| Temporal Stability | 0.25 | Frame-to-frame variance (inverted) |
| Hurst Exponent | 0.25 | Long-term correlation (H > 0.5 is coherent) |
| Color Coherence | 0.15 | Spatial color organization |

**Formula:**
```python
def calculate_coherence_score(metrics):
    """
    Calculate Coherence Score (0-100 scale).
    """
    # Pattern regularity (already 0-1)
    pattern_reg = metrics['pattern_regularity']
    
    # Temporal stability (1 - normalized variance)
    temporal_stab = metrics['temporal_stability']
    
    # Hurst exponent (map 0.5-1.0 to 0-1)
    hurst = metrics['hurst_exponent']
    hurst_norm = max(0, min(1, (hurst - 0.5) * 2))
    
    # Color coherence (already 0-1)
    color_coh = metrics['color_coherence']
    
    # Weighted combination
    raw_score = (
        0.35 * pattern_reg +
        0.25 * temporal_stab +
        0.25 * hurst_norm +
        0.15 * color_coh
    )
    
    return int(raw_score * 100)
```

**Interpretation:**
- 0-30: Chaotic/disordered patterns
- 31-50: Low coherence
- 51-70: Moderate coherence
- 71-85: Good coherence
- 86-100: Highly coherent/ordered patterns

---

### 6.4 Complexity Score

**Components and Weights:**
| Metric | Weight | Notes |
|--------|--------|-------|
| Fractal Dimension | 0.30 | Mapped from 1.0-2.0 to 0-1 |
| Color Entropy | 0.25 | Normalized to typical range |
| Correlation Dimension | 0.20 | Fractional part indicates complexity |
| Contour Complexity | 0.15 | Boundary fractal dimension |
| Inner Noise | 0.10 | Variability indicator |

**Formula:**
```python
def calculate_complexity_score(metrics):
    """
    Calculate Complexity Score (0-100 scale).
    """
    # Fractal dimension (map 1.0-2.0 to 0-1)
    fd = metrics['fractal_dimension']
    fd_norm = max(0, min(1, fd - 1.0))
    
    # Color entropy (map 3-8 bits to 0-1)
    entropy = metrics['color_entropy']
    entropy_norm = max(0, min(1, (entropy - 3) / 5))
    
    # Correlation dimension (use fractional part)
    corr_dim = metrics['correlation_dimension']
    corr_dim_norm = corr_dim % 1  # Fractional part
    
    # Contour complexity (fractal dimension of boundary)
    contour_comp = metrics['contour_complexity']
    contour_norm = max(0, min(1, contour_comp - 1.0))
    
    # Inner noise (normalize to typical range 0-50%)
    noise_norm = min(metrics['inner_noise_percent'] / 50, 1.0)
    
    # Weighted combination
    raw_score = (
        0.30 * fd_norm +
        0.25 * entropy_norm +
        0.20 * corr_dim_norm +
        0.15 * contour_norm +
        0.10 * noise_norm
    )
    
    return int(raw_score * 100)
```

**Interpretation:**
- 0-30: Simple, regular patterns
- 31-50: Low complexity
- 51-70: Moderate complexity
- 71-85: High complexity
- 86-100: Very complex/chaotic patterns

---

### 6.5 Regulation Score

**Components and Weights:**
| Metric | Weight | Notes |
|--------|--------|-------|
| Lyapunov Exponent | 0.30 | Inverted (negative = stable) |
| DFA Alpha | 0.25 | Optimal near 1.0 (1/f noise) |
| Temporal Variance | 0.20 | Inverted (low variance = regulated) |
| Recurrence Rate | 0.15 | Higher = more regulated |
| Segmented Area Variability | 0.10 | Inverted |

**Formula:**
```python
def calculate_regulation_score(metrics):
    """
    Calculate Regulation Score (0-100 scale).
    """
    # Lyapunov exponent (negative is stable, map -0.5 to +0.5 to 1-0)
    lyap = metrics['lyapunov_exponent']
    lyap_norm = max(0, min(1, 0.5 - lyap))
    
    # DFA alpha (optimal around 1.0, map 0.5-1.5 to bell curve)
    dfa = metrics['dfa_alpha']
    dfa_norm = 1 - abs(dfa - 1.0)
    dfa_norm = max(0, min(1, dfa_norm))
    
    # Temporal variance (inverted)
    temp_var = metrics['temporal_variance']
    temp_var_norm = 1 - min(temp_var / 0.3, 1.0)
    
    # Recurrence rate (already 0-1)
    recurrence = metrics.get('recurrence_rate', 0.5)
    
    # Segmented area variability (inverted)
    seg_var = metrics.get('segmented_area_variability', 0.2)
    seg_var_norm = 1 - min(seg_var / 0.5, 1.0)
    
    # Weighted combination
    raw_score = (
        0.30 * lyap_norm +
        0.25 * dfa_norm +
        0.20 * temp_var_norm +
        0.15 * recurrence +
        0.10 * seg_var_norm
    )
    
    return int(raw_score * 100)
```

**Interpretation:**
- 0-30: Dysregulated/chaotic
- 31-50: Poor regulation
- 51-70: Moderate regulation
- 71-85: Good regulation
- 86-100: Excellent regulation/homeostasis

---

### 6.6 Color Balance Score

**Components and Weights:**
| Metric | Weight | Notes |
|--------|--------|-------|
| Color Distribution Uniformity | 0.30 | Entropy-based |
| Hue Balance | 0.25 | Distribution across spectrum |
| Saturation Consistency | 0.20 | Uniformity of saturation |
| Color Coherence | 0.15 | Spatial organization |
| Color Symmetry | 0.10 | Left/right color balance |

**Formula:**
```python
def calculate_color_balance_score(metrics):
    """
    Calculate Color Balance Score (0-100 scale).
    """
    # Color distribution uniformity (higher entropy = more uniform)
    entropy = metrics['color_entropy']
    uniformity = min(entropy / 7.0, 1.0)  # Normalize to typical max
    
    # Hue balance (check coverage across spectrum)
    hue_dist = metrics['hue_distribution']
    hue_coverage = np.sum(hue_dist > 0.01) / len(hue_dist)
    
    # Saturation consistency (inverse of saturation variance)
    sat_dist = metrics['saturation_distribution']
    sat_variance = np.var(sat_dist)
    sat_consistency = 1 - min(sat_variance * 1000, 1.0)
    
    # Color coherence (already 0-1)
    coherence = metrics['color_coherence']
    
    # Color symmetry (already 0-1)
    symmetry = max(0, metrics['color_symmetry'])
    
    # Weighted combination
    raw_score = (
        0.30 * uniformity +
        0.25 * hue_coverage +
        0.20 * sat_consistency +
        0.15 * coherence +
        0.10 * symmetry
    )
    
    return int(raw_score * 100)
```

**Interpretation:**
- 0-30: Imbalanced/skewed colors
- 31-50: Poor color balance
- 51-70: Moderate color balance
- 71-85: Good color balance
- 86-100: Excellent color harmony

---

## 7. Data Flow & Processing Pipeline

### 7.1 Real-Time Pipeline (Frontend)

```
Camera Input (30fps)
       │
       ▼
┌──────────────────┐
│  WebGL2 Shader   │ ◄── PIP Parameters
│  (PIP Effect)    │
└────────┬─────────┘
         │
    ┌────┴────┐
    │ Canvas  │
    │ Output  │
    └────┬────┘
         │
    ┌────┴────────────────┐
    │  Frame Sampler      │ (10-15 FPS)
    │  (Web Worker)       │
    └────┬────────────────┘
         │
    ┌────┴────────────────┐
    │  Metric Extractor   │
    │  (Web Worker)       │
    │  - Intensity        │
    │  - LQD              │
    │  - Noise            │
    │  - Basic Symmetry   │
    │  - Color Histograms │
    └────┬────────────────┘
         │
    ┌────┴────────────────┐
    │  Score Calculator   │
    │  (Main Thread)      │
    │  - Energy (approx)  │
    │  - Symmetry (approx)│
    │  - Color Balance    │
    └────┬────────────────┘
         │
    ┌────┴────────────────┐
    │  UI Update          │
    │  - Score Cards      │
    │  - Charts           │
    │  - Indicators       │
    └─────────────────────┘
```

### 7.2 Capture & Detailed Analysis Pipeline

```
User Clicks "Capture"
         │
         ▼
┌─────────────────────────┐
│  Full Resolution Frame  │
│  Capture from Canvas    │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Send to Backend        │──► WebSocket / REST
│  (Base64 Image)         │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│                                                                  │
│  ┌───────────────────┐   ┌───────────────────┐                  │
│  │  Image Decode     │──►│  Preprocessing    │                  │
│  │  (OpenCV)         │   │  - Resize         │                  │
│  └───────────────────┘   │  - Color convert  │                  │
│                          │  - Denoise        │                  │
│                          └─────────┬─────────┘                  │
│                                    │                             │
│  ┌─────────────────────────────────┼─────────────────────────┐  │
│  │                                 │                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │  │
│  │  │Basic Metrics │  │Color Analysis│  │Geometric Analysis│ │  │
│  │  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │  │
│  │         │                  │                   │           │  │
│  │  ┌──────┴───────┐  ┌──────┴───────┐  ┌────────┴─────────┐ │  │
│  │  │Symmetry      │  │Nonlinear     │  │Segmented         │ │  │
│  │  │Analysis      │  │Dynamics      │  │Analysis          │ │  │
│  │  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │  │
│  │         │                  │                   │           │  │
│  │         └──────────────────┼───────────────────┘           │  │
│  │                            │                               │  │
│  │                    ┌───────┴───────┐                       │  │
│  │                    │Score Calculator│                      │  │
│  │                    └───────┬───────┘                       │  │
│  │                            │                               │  │
│  └────────────────────────────┼───────────────────────────────┘  │
│                               │                                  │
│  ┌────────────────────────────┴───────────────────────────────┐  │
│  │                    Store Results                            │  │
│  │  - PostgreSQL (analysis record)                            │  │
│  │  - File Storage (original + processed images)              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  Return to Frontend     │
                    │  - All metrics          │
                    │  - All scores           │
                    │  - Segmented data       │
                    │  - Image URLs           │
                    └─────────────────────────┘
```

### 7.3 Temporal Analysis Pipeline (Video Session)

```
Session Start
     │
     ▼
┌────────────────────────┐
│  Initialize Buffers    │
│  - Metric history      │
│  - Frame buffer        │
│  - Baseline reference  │
└──────────┬─────────────┘
           │
           ▼
     ┌─────────────┐
     │ Frame Loop  │◄────────────────┐
     └──────┬──────┘                 │
            │                        │
            ▼                        │
┌───────────────────────┐            │
│ Extract Frame Metrics │            │
└──────────┬────────────┘            │
           │                         │
           ▼                         │
┌───────────────────────┐            │
│ Add to Rolling Buffer │            │
│ (30-60 frames)        │            │
└──────────┬────────────┘            │
           │                         │
           ▼                         │
┌───────────────────────┐            │
│ Calculate Temporal    │            │
│ Metrics:              │            │
│ - Trend               │            │
│ - Variance            │            │
│ - Stability           │            │
└──────────┬────────────┘            │
           │                         │
           ▼                         │
┌───────────────────────┐            │
│ Update Composite      │            │
│ Scores (smoothed)     │            │
└──────────┬────────────┘            │
           │                         │
           ▼                         │
┌───────────────────────┐            │
│ Broadcast to UI       │────────────┘
│ (WebSocket)           │
└───────────────────────┘
           │
           ▼ (Every N seconds)
┌───────────────────────┐
│ Persist Snapshot      │
│ to Database           │
└───────────────────────┘
```

---

## 8. API Specification

### 8.1 REST Endpoints

#### 8.1.1 Analysis Endpoints

```yaml
POST /api/v1/analysis/capture
  Description: Analyze a captured frame
  Request:
    Content-Type: multipart/form-data
    Body:
      image: File (JPEG/PNG)
      pip_settings: JSON (optional)
      analysis_mode: string (fullBody|face|segmented)
  Response:
    status: 200
    body:
      analysis_id: UUID
      timestamp: ISO8601
      metrics: MetricsObject
      scores: ScoresObject
      segmented_data: SegmentedDataObject (if mode=segmented)
      images:
        original_url: string
        processed_url: string
        
POST /api/v1/analysis/batch
  Description: Analyze multiple images
  Request:
    Content-Type: multipart/form-data
    Body:
      images: File[] (max 10)
      analysis_mode: string
  Response:
    status: 202
    body:
      batch_id: UUID
      status: processing
      
GET /api/v1/analysis/{analysis_id}
  Description: Get analysis results
  Response:
    status: 200
    body: AnalysisResult

GET /api/v1/analysis/history
  Description: Get analysis history
  Query Parameters:
    start_date: ISO8601
    end_date: ISO8601
    limit: int (default 50)
    offset: int (default 0)
  Response:
    status: 200
    body:
      total: int
      items: AnalysisResult[]
```

#### 8.1.2 Baseline Endpoints

```yaml
POST /api/v1/baseline/create
  Description: Create baseline from session
  Request:
    body:
      session_id: UUID
      name: string (optional)
  Response:
    status: 201
    body:
      baseline_id: UUID
      metrics: BaselineMetrics

GET /api/v1/baseline/current
  Description: Get active baseline
  Response:
    status: 200
    body: BaselineData

PUT /api/v1/baseline/{baseline_id}/activate
  Description: Set baseline as active
  Response:
    status: 200

DELETE /api/v1/baseline/{baseline_id}
  Description: Delete baseline
  Response:
    status: 204
```

#### 8.1.3 Export Endpoints

```yaml
GET /api/v1/export/session/{session_id}
  Description: Export session data
  Query Parameters:
    format: csv|json|xlsx
  Response:
    Content-Type: application/octet-stream
    Body: File download

GET /api/v1/export/analysis/{analysis_id}
  Description: Export single analysis
  Query Parameters:
    format: csv|json|pdf
    include_images: boolean
  Response:
    Content-Type: application/octet-stream
    Body: File download
```

### 8.2 WebSocket API

#### 8.2.1 Connection

```javascript
// Connect
ws = new WebSocket('wss://api.example.com/ws/v1/realtime');

// Authentication
ws.send(JSON.stringify({
  type: 'auth',
  token: 'jwt_token'
}));

// Start session
ws.send(JSON.stringify({
  type: 'session_start',
  settings: {
    mode: 'fullBody',
    fps: 10,
    metrics: ['energy', 'symmetry', 'coherence']
  }
}));
```

#### 8.2.2 Message Types

```typescript
// Client -> Server
interface ClientMessage {
  type: 'auth' | 'session_start' | 'session_end' | 'frame' | 'ping';
  payload?: any;
}

// Frame submission
interface FrameMessage {
  type: 'frame';
  payload: {
    timestamp: number;
    frame_data: string; // Base64 encoded
    pip_settings?: PIPSettings;
  };
}

// Server -> Client
interface ServerMessage {
  type: 'auth_success' | 'metrics' | 'scores' | 'error' | 'pong';
  payload: any;
}

// Real-time metrics response
interface MetricsResponse {
  type: 'metrics';
  payload: {
    timestamp: number;
    metrics: RealTimeMetrics;
    scores: CompositeScores;
    trends: TrendData;
  };
}
```

### 8.3 Data Models

```typescript
interface AnalysisResult {
  id: string;
  timestamp: string;
  mode: 'fullBody' | 'face' | 'segmented';
  
  // Raw metrics
  metrics: {
    basic: BasicMetrics;
    geometric: GeometricMetrics;
    nonlinear: NonlinearMetrics;
    color: ColorMetrics;
    symmetry: SymmetryMetrics;
  };
  
  // Composite scores
  scores: {
    energy: number;
    symmetry: number;
    coherence: number;
    complexity: number;
    regulation: number;
    colorBalance: number;
  };
  
  // Segmented analysis (if applicable)
  segments?: SegmentedAnalysis[];
  
  // Reference images
  images: {
    original: string;
    processed: string;
    heatmap?: string;
  };
  
  // Comparison to baseline
  baseline_comparison?: {
    energy_delta: number;
    symmetry_delta: number;
    // ... etc
  };
}

interface BasicMetrics {
  avgIntensity: number;
  intensityStdDev: number;
  lightQuantaDensity: number;
  normalizedArea: number;
  innerNoise: number;
  innerNoisePercent: number;
  energy: number;
}

interface GeometricMetrics {
  area: number;
  perimeter: number;
  innerContourLength: number;
  innerContourRadius: number;
  outerContourLength: number;
  outerContourRadius: number;
  ellipseMajor: number;
  ellipseMinor: number;
  entropyCoefficient: number;
  formCoefficient: number;
}

interface NonlinearMetrics {
  fractalDimension: number;
  hurstExponent: number;
  lyapunovExponent: number;
  correlationDimension: number;
  dfaAlpha: number;
  recurrenceRate?: number;
}

interface ColorMetrics {
  dominantHue: number;
  meanSaturation: number;
  meanValue: number;
  colorEntropy: number;
  colorCoherence: number;
  colorSymmetry: number;
  hueDistribution: number[];
  saturationDistribution: number[];
}

interface SymmetryMetrics {
  horizontalCorrelation: number;
  horizontalSSIM: number;
  verticalCorrelation: number;
  verticalSSIM: number;
  combinedSymmetry: number;
  leftComplexity: number;
  rightComplexity: number;
}

interface SegmentedAnalysis {
  name: string;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metrics: BasicMetrics;
  scores: {
    energy: number;
    coherence: number;
  };
}
```

---

## 9. Database Schema

### 9.1 PostgreSQL Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (recording sessions)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    mode VARCHAR(50) NOT NULL,
    pip_settings JSONB,
    notes TEXT
);

-- Analysis results table
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    mode VARCHAR(50) NOT NULL,
    
    -- Raw metrics stored as JSONB
    basic_metrics JSONB NOT NULL,
    geometric_metrics JSONB NOT NULL,
    nonlinear_metrics JSONB,
    color_metrics JSONB NOT NULL,
    symmetry_metrics JSONB NOT NULL,
    
    -- Composite scores (indexed for querying)
    energy_score INTEGER NOT NULL,
    symmetry_score INTEGER NOT NULL,
    coherence_score INTEGER NOT NULL,
    complexity_score INTEGER,
    regulation_score INTEGER,
    color_balance_score INTEGER NOT NULL,
    
    -- Image references
    original_image_path VARCHAR(500),
    processed_image_path VARCHAR(500),
    
    -- Indexes for common queries
    CONSTRAINT scores_range CHECK (
        energy_score BETWEEN 0 AND 100 AND
        symmetry_score BETWEEN 0 AND 100 AND
        coherence_score BETWEEN 0 AND 100
    )
);

CREATE INDEX idx_analyses_user_timestamp ON analyses(user_id, timestamp DESC);
CREATE INDEX idx_analyses_session ON analyses(session_id);

-- Segmented analysis table
CREATE TABLE segmented_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
    segment_name VARCHAR(100) NOT NULL,
    region_x INTEGER NOT NULL,
    region_y INTEGER NOT NULL,
    region_width INTEGER NOT NULL,
    region_height INTEGER NOT NULL,
    metrics JSONB NOT NULL,
    energy_score INTEGER,
    coherence_score INTEGER
);

CREATE INDEX idx_segmented_analysis ON segmented_analyses(analysis_id);

-- Baselines table
CREATE TABLE baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE,
    
    -- Baseline metrics (averages from calibration session)
    avg_energy_score NUMERIC(5,2),
    avg_symmetry_score NUMERIC(5,2),
    avg_coherence_score NUMERIC(5,2),
    avg_complexity_score NUMERIC(5,2),
    avg_regulation_score NUMERIC(5,2),
    avg_color_balance_score NUMERIC(5,2),
    
    -- Detailed baseline metrics
    baseline_metrics JSONB NOT NULL,
    
    -- Calibration data
    sample_count INTEGER NOT NULL,
    std_dev_energy NUMERIC(5,2),
    std_dev_symmetry NUMERIC(5,2),
    std_dev_coherence NUMERIC(5,2)
);

CREATE INDEX idx_baselines_user ON baselines(user_id);
CREATE UNIQUE INDEX idx_baselines_active ON baselines(user_id) WHERE is_active = TRUE;

-- Real-time snapshots (for session playback)
CREATE TABLE realtime_snapshots (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metrics JSONB NOT NULL,
    scores JSONB NOT NULL
);

CREATE INDEX idx_snapshots_session ON realtime_snapshots(session_id, timestamp);
```

### 9.2 Redis Cache Schema

```
# Current session data
session:{session_id}:metrics -> JSON (current metrics)
session:{session_id}:scores -> JSON (current scores)
session:{session_id}:buffer -> List (rolling frame buffer)

# User baselines (cached)
user:{user_id}:baseline -> JSON (active baseline)

# Real-time subscriptions
pubsub:session:{session_id} -> PubSub channel for metrics updates
```

---

## 10. Audio-Visual Entrainment Integration

### 10.1 Overview

The system can generate audio-visual feedback based on real-time metrics for entrainment purposes. This creates a biofeedback loop where the user can perceive their biofield state through sound and visual patterns.

### 10.2 Audio Generation Parameters

| Metric | Audio Mapping |
|--------|---------------|
| Energy Score | Base frequency (110-440 Hz) |
| Coherence Score | Harmonic complexity (sine to rich overtones) |
| Symmetry Score | Stereo balance (left/right panning) |
| Regulation Score | Tempo stability (rhythm regularity) |
| Color Balance | Timbre selection (warm/cool tones) |

### 10.3 Audio Generation Specification

```python
# Backend audio generation interface
class EntrainmentAudioGenerator:
    def __init__(self, sample_rate=44100):
        self.sample_rate = sample_rate
        self.current_params = {}
    
    def update_from_scores(self, scores: CompositeScores):
        """
        Map composite scores to audio parameters.
        """
        self.current_params = {
            'base_freq': self._map_energy_to_freq(scores.energy),
            'harmonics': self._map_coherence_to_harmonics(scores.coherence),
            'pan': self._map_symmetry_to_pan(scores.symmetry),
            'tempo': self._map_regulation_to_tempo(scores.regulation),
            'timbre': self._map_color_to_timbre(scores.colorBalance)
        }
    
    def _map_energy_to_freq(self, energy: int) -> float:
        """Map energy (0-100) to frequency (110-440 Hz)."""
        return 110 + (energy / 100) * 330
    
    def _map_coherence_to_harmonics(self, coherence: int) -> int:
        """Map coherence (0-100) to number of harmonics (1-8)."""
        return 1 + int((coherence / 100) * 7)
    
    def generate_sample(self, duration: float) -> np.ndarray:
        """Generate audio sample based on current parameters."""
        # Implementation details...
        pass
```

### 10.4 Visual Feedback Specification

```typescript
interface VisualEntrainmentConfig {
  // Background color mapping
  backgroundColor: {
    metric: 'energy' | 'colorBalance';
    mapping: 'hue' | 'brightness' | 'saturation';
  };
  
  // Particle/pattern animation
  animation: {
    speedMetric: 'energy';
    densityMetric: 'complexity';
    coherenceMetric: 'coherence';
  };
  
  // Symmetry visualization
  symmetryOverlay: {
    enabled: boolean;
    opacity: number;
  };
  
  // Pulse effect
  pulse: {
    enabled: boolean;
    rateMetric: 'regulation';
    intensityMetric: 'energy';
  };
}
```

### 10.5 Entrainment Presets

```yaml
Relaxation:
  target_state:
    energy: 40-60
    coherence: 70+
    regulation: 70+
  audio:
    base_freq_range: 110-220 Hz
    tempo: 60 BPM
    harmonics: rich
  visual:
    colors: blues, greens
    animation: slow, flowing

Focus:
  target_state:
    energy: 60-80
    coherence: 80+
    complexity: 50-70
  audio:
    base_freq_range: 220-330 Hz
    tempo: 80 BPM
    harmonics: moderate
  visual:
    colors: yellows, whites
    animation: steady, geometric

Energize:
  target_state:
    energy: 80+
    complexity: 60+
  audio:
    base_freq_range: 330-440 Hz
    tempo: 100 BPM
    harmonics: simple, bright
  visual:
    colors: oranges, reds
    animation: fast, dynamic
```

---

## 11. Calibration & Normalization

### 11.1 Baseline Establishment Process

```
1. Initial Calibration Session (5-10 minutes)
   │
   ├── User rests quietly in front of camera
   │
   ├── System captures frames at 1 FPS for 5 minutes
   │
   ├── Calculate metrics for each frame
   │
   ├── Compute statistics:
   │   - Mean for each metric
   │   - Standard deviation
   │   - Min/Max range
   │   - Percentile distributions (25th, 50th, 75th)
   │
   └── Store as user's baseline

2. Baseline Validation
   │
   ├── Require minimum 50 samples
   │
   ├── Check for outliers (> 3 std from mean)
   │
   ├── Verify temporal stability (no drift)
   │
   └── Alert if high variance (suggests movement/issues)

3. Baseline Usage
   │
   ├── Real-time: Compare current metrics to baseline
   │
   ├── Display delta (+ or -) from baseline
   │
   └── Color code: green (within 1 std), yellow (1-2 std), red (> 2 std)
```

### 11.2 Normalization Functions

```python
class MetricNormalizer:
    def __init__(self, baseline: Optional[BaselineData] = None):
        self.baseline = baseline
        
        # Population defaults (used when no baseline)
        self.defaults = {
            'avg_intensity': {'mean': 128, 'std': 30},
            'light_quanta_density': {'mean': 0.4, 'std': 0.15},
            'inner_noise_percent': {'mean': 22, 'std': 8},
            'fractal_dimension': {'mean': 1.5, 'std': 0.2},
            'hurst_exponent': {'mean': 0.7, 'std': 0.15},
            # ... etc
        }
    
    def normalize(self, metric_name: str, value: float) -> float:
        """
        Normalize metric to 0-1 scale based on baseline or defaults.
        """
        if self.baseline and metric_name in self.baseline.metrics:
            mean = self.baseline.metrics[metric_name]['mean']
            std = self.baseline.metrics[metric_name]['std']
        else:
            mean = self.defaults[metric_name]['mean']
            std = self.defaults[metric_name]['std']
        
        # Z-score normalization, then sigmoid to bound 0-1
        z_score = (value - mean) / (std + 1e-6)
        normalized = 1 / (1 + np.exp(-z_score))
        
        return normalized
    
    def get_delta(self, metric_name: str, value: float) -> dict:
        """
        Get delta from baseline with significance level.
        """
        if not self.baseline:
            return {'delta': 0, 'significance': 'unknown'}
        
        mean = self.baseline.metrics[metric_name]['mean']
        std = self.baseline.metrics[metric_name]['std']
        
        delta = value - mean
        z_score = delta / (std + 1e-6)
        
        if abs(z_score) < 1:
            significance = 'normal'
        elif abs(z_score) < 2:
            significance = 'moderate'
        else:
            significance = 'significant'
        
        return {
            'delta': delta,
            'delta_percent': (delta / mean) * 100 if mean > 0 else 0,
            'z_score': z_score,
            'significance': significance
        }
```

### 11.3 Environmental Calibration

```python
class EnvironmentCalibrator:
    """
    Calibrate for lighting conditions and camera characteristics.
    """
    
    def calibrate_lighting(self, reference_frames: List[np.ndarray]) -> dict:
        """
        Analyze reference frames to establish lighting baseline.
        """
        intensities = [np.mean(frame) for frame in reference_frames]
        
        return {
            'ambient_light_level': np.mean(intensities),
            'light_stability': 1 - (np.std(intensities) / np.mean(intensities)),
            'recommended_threshold': np.mean(intensities) + 0.5 * np.std(intensities)
        }
    
    def adjust_for_camera(self, camera_profile: str) -> dict:
        """
        Return adjustment factors for known camera profiles.
        """
        profiles = {
            'iphone_front': {
                'intensity_multiplier': 1.1,
                'color_correction': [1.0, 0.98, 1.02],
                'noise_floor': 5
            },
            'macbook_facetime': {
                'intensity_multiplier': 1.0,
                'color_correction': [1.0, 1.0, 1.0],
                'noise_floor': 8
            },
            'generic_webcam': {
                'intensity_multiplier': 0.95,
                'color_correction': [1.0, 1.0, 1.0],
                'noise_floor': 10
            }
        }
        
        return profiles.get(camera_profile, profiles['generic_webcam'])
```

---

## 12. Testing Requirements

### 12.1 Unit Tests

```
Backend Tests:
├── test_metrics/
│   ├── test_basic_metrics.py
│   │   - test_light_quanta_density_calculation
│   │   - test_average_intensity_accuracy
│   │   - test_inner_noise_computation
│   │   - test_normalized_area_bounds
│   │
│   ├── test_geometric_metrics.py
│   │   - test_contour_detection
│   │   - test_entropy_coefficient_formula
│   │   - test_form_coefficient_circle
│   │   - test_ellipse_fitting
│   │
│   ├── test_nonlinear_metrics.py
│   │   - test_fractal_dimension_known_patterns
│   │   - test_hurst_exponent_synthetic_data
│   │   - test_lyapunov_stable_vs_chaotic
│   │   - test_dfa_correlation_detection
│   │
│   ├── test_color_metrics.py
│   │   - test_color_entropy_uniform_vs_diverse
│   │   - test_color_symmetry_symmetric_image
│   │   - test_dominant_hue_extraction
│   │
│   └── test_symmetry_metrics.py
│       - test_bilateral_symmetry_perfect
│       - test_bilateral_symmetry_asymmetric
│       - test_ssim_calculation
│
├── test_scores/
│   ├── test_energy_score.py
│   ├── test_symmetry_score.py
│   ├── test_coherence_score.py
│   ├── test_complexity_score.py
│   ├── test_regulation_score.py
│   └── test_color_balance_score.py
│
└── test_api/
    ├── test_analysis_endpoints.py
    ├── test_baseline_endpoints.py
    ├── test_websocket_handler.py
    └── test_export_endpoints.py

Frontend Tests:
├── test_components/
│   ├── VideoPanel.test.tsx
│   ├── ScoreCard.test.tsx
│   ├── MetricsChart.test.tsx
│   └── CaptureModal.test.tsx
│
├── test_hooks/
│   ├── useMetricExtraction.test.ts
│   └── useWebSocket.test.ts
│
└── test_utils/
    ├── metricCalculations.test.ts
    └── normalization.test.ts
```

### 12.2 Integration Tests

```
- Camera capture -> PIP rendering -> Metric extraction pipeline
- Frame capture -> Backend analysis -> Results display
- Real-time WebSocket connection -> Metric streaming -> UI updates
- Baseline creation -> Comparison calculation -> Delta display
- Export functionality -> File generation -> Download
```

### 12.3 Performance Tests

```
Targets:
- Real-time metric extraction: < 50ms per frame at 640x480
- Backend detailed analysis: < 2 seconds per image
- WebSocket latency: < 100ms round-trip
- UI render: 60 FPS maintained
- Memory usage: < 500MB client, < 1GB server
```

### 12.4 Test Data

```
Provide test images:
- Synthetic PIP patterns with known metrics
- Reference images from Bio-Well or similar systems
- Edge cases: blank, saturated, noisy images
- Video sequences for temporal analysis testing
```

---

## 13. Implementation Phases

### Phase 1: Core Infrastructure (Weeks 1-2)

**Frontend:**
- [ ] Set up React project with TypeScript
- [ ] Integrate existing PIP WebGL shader
- [ ] Implement camera capture with WebRTC
- [ ] Create basic UI layout (video + sidebar)
- [ ] Implement frame capture functionality

**Backend:**
- [ ] Set up FastAPI project structure
- [ ] Implement basic metric calculations (intensity, area, noise)
- [ ] Create REST endpoints for image analysis
- [ ] Set up PostgreSQL database
- [ ] Implement basic image storage

**Deliverable:** Working app that captures frames and shows basic metrics

---

### Phase 2: Real-Time Metrics (Weeks 3-4)

**Frontend:**
- [ ] Implement Web Worker for metric extraction
- [ ] Create real-time score cards
- [ ] Add time-series chart component
- [ ] Implement metric history buffer

**Backend:**
- [ ] Implement WebSocket endpoint
- [ ] Add geometric metrics (contour analysis)
- [ ] Add color metrics
- [ ] Implement basic symmetry analysis

**Deliverable:** Real-time dashboard with updating metrics and charts

---

### Phase 3: Advanced Analysis (Weeks 5-6)

**Backend:**
- [ ] Implement nonlinear dynamics metrics (fractal, Hurst, Lyapunov)
- [ ] Add DFA and correlation dimension
- [ ] Implement segmented analysis
- [ ] Create composite score calculations

**Frontend:**
- [ ] Add detailed analysis modal for captured frames
- [ ] Implement segmented view
- [ ] Add metric comparison views

**Deliverable:** Full detailed analysis capability with all metrics

---

### Phase 4: Baseline & Comparison (Weeks 7-8)

**Backend:**
- [ ] Implement baseline creation workflow
- [ ] Add comparison calculations
- [ ] Create baseline management endpoints

**Frontend:**
- [ ] Add baseline calibration UI
- [ ] Implement baseline comparison displays
- [ ] Add delta indicators to score cards

**Deliverable:** Complete baseline system with comparison functionality

---

### Phase 5: Entrainment & Export (Weeks 9-10)

**Backend:**
- [ ] Implement audio generation module
- [ ] Add visual feedback parameters
- [ ] Create export functionality (CSV, JSON, PDF)

**Frontend:**
- [ ] Add entrainment controls
- [ ] Implement visual feedback overlay
- [ ] Add export UI and download functionality

**Deliverable:** Complete application with entrainment and export features

---

### Phase 6: Polish & Optimization (Weeks 11-12)

- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Error handling improvements
- [ ] Documentation
- [ ] User testing and feedback integration

**Deliverable:** Production-ready application

---

## Appendix A: Reference Values

### A.1 Typical Metric Ranges

| Metric | Low | Normal | High | Unit |
|--------|-----|--------|------|------|
| Light Quanta Density | < 0.2 | 0.3-0.5 | > 0.6 | ratio |
| Average Intensity | < 80 | 100-150 | > 180 | 0-255 |
| Inner Noise % | < 15 | 18-28 | > 35 | % |
| Entropy Coefficient | < 1.2 | 1.5-2.5 | > 3.0 | - |
| Form Coefficient | < 1.5 | 2.0-3.5 | > 4.0 | - |
| Fractal Dimension | < 1.3 | 1.4-1.7 | > 1.8 | - |
| Hurst Exponent | < 0.4 | 0.6-0.8 | > 0.9 | - |
| Lyapunov Exponent | < -0.1 | -0.05-0.05 | > 0.1 | - |
| Color Entropy | < 4.0 | 5.0-7.0 | > 8.0 | bits |

### A.2 Score Interpretation Guide

| Score Range | Energy | Symmetry | Coherence | Complexity | Regulation |
|-------------|--------|----------|-----------|------------|------------|
| 0-20 | Very Low | Highly Asymmetric | Chaotic | Very Simple | Dysregulated |
| 21-40 | Low | Asymmetric | Disorganized | Simple | Poor |
| 41-60 | Moderate | Moderate | Moderate | Moderate | Moderate |
| 61-80 | Good | Good Balance | Organized | Complex | Well Regulated |
| 81-100 | High | Excellent | Highly Coherent | Very Complex | Optimal |

---

## Appendix B: Anatomical Segmentation Regions

Based on Bio-Well/GDV finger sector mapping adapted for full-body PIP:

```
Full Body Segments:
1. Head/Crown - Top 15% of image height
2. Face/Third Eye - Face detection ROI
3. Throat - Below chin, above shoulders
4. Heart/Chest - Upper torso
5. Solar Plexus - Mid torso
6. Sacral - Lower torso
7. Root - Hips and below

Face Segments:
1. Forehead/Crown
2. Right Eye
3. Left Eye
4. Right Ear/Sinus
5. Left Ear/Sinus
6. Nose
7. Right Jaw
8. Left Jaw
9. Throat/Thyroid
```

---

## Appendix C: PIP Shader Parameters Reference

From the existing implementation:

| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| seed | 8057 | 0-9999 | Noise pattern seed |
| period | 0.06 | 0.01-2.0 | Spatial frequency |
| harmonics | 4 | 0-8 | Noise complexity |
| spread | 2.0 | 1.0-4.0 | Harmonic spread |
| gain | 0.29 | 0.0-1.0 | Harmonic amplitude |
| roughness | 0.33 | 0.0-1.0 | Texture roughness |
| exponent | 1.04 | 0.1-3.0 | Contrast curve |
| amplitude | 0.96 | 0.0-2.0 | Output amplitude |
| offset | 0.47 | 0.0-1.0 | Brightness offset |
| speed | 1.0 | 0.0-3.0 | Animation speed |
| intensity | 0.96 | 0.0-2.0 | Effect intensity |
| videoInfluence | 0.3 | 0.0-1.0 | Video modulation |
| colorSaturation | 0.83 | 0.0-1.0 | Color saturation |
| hueShift | 0.82 | 0.0-1.0 | Hue rotation |
| blurAmount | 5.9 | 0.0-10.0 | Gaussian blur |

---

*End of Specification Document*
