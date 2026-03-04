# PIP Segmentation & Multi-Zone Analysis Specification
## Supplementary Document

**Version:** 1.1  
**Date:** December 2024  
**Purpose:** Detailed specification for body/face segmentation and inner/outer symmetry analysis

---

## Table of Contents

1. [Segmentation Overview](#1-segmentation-overview)
2. [Technology Decision: MediaPipe](#2-technology-decision-mediapipe)
3. [Full Body Segmentation](#3-full-body-segmentation)
4. [Face Segmentation](#4-face-segmentation)
5. [Zone Definition System](#5-zone-definition-system)
6. [Multi-Zone Symmetry Analysis](#6-multi-zone-symmetry-analysis)
7. [Implementation Architecture](#7-implementation-architecture)
8. [API Updates](#8-api-updates)

---

## 1. Segmentation Overview

### 1.1 Core Concept

In PIP analysis, the image contains multiple meaningful zones:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    BACKGROUND (Zone 4)                                      │
│         Reference/ambient patterns                          │
│                                                             │
│      ┌─────────────────────────────────────────────┐       │
│      │  DISTAL FIELD (Zone 3)                      │       │
│      │    Outer energy field patterns              │       │
│      │                                             │       │
│      │    ┌─────────────────────────────────┐     │       │
│      │    │  PROXIMAL FIELD (Zone 2)        │     │       │
│      │    │    Inner aura / immediate field │     │       │
│      │    │                                 │     │       │
│      │    │    ┌───────────────────┐       │     │       │
│      │    │    │                   │       │     │       │
│      │    │    │   BODY (Zone 1)   │       │     │       │
│      │    │    │   Subject core    │       │     │       │
│      │    │    │                   │       │     │       │
│      │    │    └───────────────────┘       │     │       │
│      │    │                                 │     │       │
│      │    └─────────────────────────────────┘     │       │
│      │                                             │       │
│      └─────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Why Multi-Zone Analysis Matters

| Zone | PIP Interpretation | Analysis Value |
|------|-------------------|----------------|
| Body Core | Physical energy patterns | Health indicators, chakra mapping |
| Proximal Field | Immediate biofield/aura | Emotional state, vitality |
| Distal Field | Extended energy field | Environmental interaction |
| Background | Ambient reference | Calibration, comparison baseline |

### 1.3 Symmetry Types

| Symmetry Type | What It Measures | Significance |
|---------------|------------------|--------------|
| Inner (Body) | Left/right body pattern balance | Physical/structural balance |
| Outer (Field) | Left/right field pattern balance | Energy field balance |
| Field-Body | Relationship between field and body | Energy flow coherence |
| Contour | Boundary complexity balance | Edge energy distribution |

---

## 2. Technology Decision: MediaPipe

### 2.1 MANDATORY: Use MediaPipe for All Segmentation

**This is a firm architectural decision. Do NOT use alternative segmentation models.**

The coding agent MUST implement segmentation using:
- **MediaPipe Selfie Segmentation** for body/background separation
- **MediaPipe Face Mesh** for facial landmark detection and region segmentation

### 2.2 Rationale: Why MediaPipe Over Alternatives

We evaluated several segmentation technologies including Meta's SAM 3 (Segment Anything Model 3), SAM 2, and various deep learning approaches. MediaPipe was selected for the following critical reasons:

#### 2.2.1 Performance Comparison

| Factor | MediaPipe | SAM 3 | SAM 2 |
|--------|-----------|-------|-------|
| **Latency** | 5-15ms | 30ms (H200 GPU) | 50-100ms |
| **Hardware** | CPU/integrated GPU | H100/H200 GPU required | Dedicated GPU |
| **Browser Support** | ✅ Native TensorFlow.js | ❌ Server only | ❌ Server only |
| **Model Size** | 2-5 MB | 2+ GB | 300+ MB |
| **Setup Complexity** | npm/pip install | CUDA, complex deps | Moderate |
| **Real-time Capable** | ✅ 30+ FPS | ❌ ~33 FPS max on $30k GPU | ❌ ~10-20 FPS |
| **Offline/Local** | ✅ Yes | ❌ No | ❌ No |

#### 2.2.2 Why SAM 3 is NOT Suitable

Despite being state-of-the-art, SAM 3 is **overkill and impractical** for this project:

1. **Hardware Requirements**: SAM 3 requires H200/H100 GPUs ($30,000+) for real-time performance
2. **No Browser Support**: Cannot run in browser; requires server round-trip adding 50-200ms latency
3. **Designed for Different Use Case**: SAM 3 excels at segmenting arbitrary objects from text prompts (e.g., "the striped red umbrella") - we only need person/background separation
4. **Cost**: GPU server costs vs. free client-side processing
5. **Complexity**: Massive model size, complex deployment

#### 2.2.3 Why MediaPipe is Perfect

1. **Lite Computation Priority**: Runs on any device including mobile browsers
2. **Real-Time Performance**: 5-15ms latency enables 30+ FPS analysis
3. **Browser-Native**: TensorFlow.js implementation, no server required for segmentation
4. **Sufficient Accuracy**: 90-95% accuracy for person segmentation is MORE than adequate for PIP zone creation
5. **Face Mesh Bonus**: 468 facial landmarks included for detailed face analysis
6. **Zero Infrastructure Cost**: Runs on user's device
7. **Offline Capable**: Works without internet after initial load
8. **Battle-Tested**: Used by millions of applications, stable and reliable

#### 2.2.4 Accuracy is Sufficient

For PIP analysis, we need to:
- Separate person from background → MediaPipe: 90-95% accurate ✅
- Create zone masks via dilation → Works perfectly with MediaPipe output ✅
- Detect face regions → MediaPipe Face Mesh: 468 landmarks ✅

We do NOT need:
- Pixel-perfect segmentation of complex objects
- Text-prompted arbitrary object detection
- Multi-object scene understanding

### 2.3 Future Upgrade Path

If advanced segmentation is ever needed (e.g., premium tier with specific object detection):

```
Phase 1 (Current): MediaPipe only - browser-based, real-time
Phase 2 (Future):  Optional SAM 2 backend for "detailed analysis" mode only
Phase 3 (Future):  SAM 3 for research/batch processing if GPU infrastructure exists
```

**The coding agent should implement Phase 1 only. Do not pre-optimize for Phases 2-3.**

### 2.4 Implementation Requirements

```
REQUIRED packages:

Frontend (Browser):
- @mediapipe/selfie_segmentation
- @mediapipe/face_mesh
- @tensorflow/tfjs (peer dependency)

Backend (Python - for detailed analysis only):
- mediapipe
- opencv-python
- numpy

DO NOT INSTALL:
- segment-anything (SAM)
- sam2
- torch/torchvision for segmentation
- Any model requiring GPU for segmentation
```

---

## 3. Full Body Segmentation

### 3.1 Technology: MediaPipe Selfie Segmentation (MANDATORY)

**Use MediaPipe Selfie Segmentation exclusively. No alternatives.**

Key characteristics:
- Real-time capable (30+ FPS on mobile devices)
- Works in browser via TensorFlow.js
- Works in Python backend via mediapipe package
- Outputs binary mask + confidence map
- Model selection: Use `model_selection=1` (landscape) for better quality

**Optional Enhancement: MediaPipe Pose**
- 33 body landmarks for detailed body part analysis
- Can be combined with Selfie Segmentation for richer data
- Use only if body part-specific metrics are needed

### 3.2 MediaPipe Selfie Segmentation Implementation

**Frontend (JavaScript/TypeScript):**
```typescript
// Installation: npm install @mediapipe/selfie_segmentation

interface SegmentationConfig {
  modelSelection: 0 | 1;  // 0 = general, 1 = landscape (USE 1)
  selfieMode: boolean;
}

// Usage pattern (not implementation)
class BodySegmenter {
  private segmenter: SelfieSegmentation;
  
  async initialize(config: SegmentationConfig): Promise<void>;
  
  async segment(frame: ImageData): Promise<SegmentationResult>;
  
  // Returns binary mask where 1 = person, 0 = background
  getMask(): Uint8Array;
  
  // Returns confidence map (0-1 float per pixel)
  getConfidenceMap(): Float32Array;
}

interface SegmentationResult {
  mask: ImageData;           // Binary mask
  confidence: Float32Array;  // Per-pixel confidence
  boundingBox: BoundingBox;  // Person bounding box
  centroid: Point;           // Center of mass
}
```

**Backend (Python):**
```python
# Installation: pip install mediapipe opencv-python

import mediapipe as mp
import numpy as np

class BodySegmenter:
    """
    MediaPipe-based body segmentation for PIP analysis.
    """
    
    def __init__(self, model_selection: int = 1):
        """
        Initialize segmenter.
        
        Args:
            model_selection: 0 for general, 1 for landscape (recommended)
        """
        self.mp_selfie = mp.solutions.selfie_segmentation
        self.segmenter = self.mp_selfie.SelfieSegmentation(
            model_selection=model_selection
        )
    
    def segment(self, image: np.ndarray) -> dict:
        """
        Segment body from background.
        
        Args:
            image: BGR image (OpenCV format)
            
        Returns:
            dict with mask, confidence, bounding_box, centroid
        """
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Process
        results = self.segmenter.process(image_rgb)
        
        # Get mask (0-1 float, threshold for binary)
        mask_float = results.segmentation_mask
        mask_binary = (mask_float > 0.5).astype(np.uint8) * 255
        
        # Calculate bounding box
        contours, _ = cv2.findContours(
            mask_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        if contours:
            largest = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest)
            bounding_box = {'x': x, 'y': y, 'width': w, 'height': h}
            
            # Calculate centroid
            M = cv2.moments(largest)
            if M['m00'] > 0:
                cx = int(M['m10'] / M['m00'])
                cy = int(M['m01'] / M['m00'])
            else:
                cx, cy = x + w // 2, y + h // 2
        else:
            bounding_box = None
            cx, cy = image.shape[1] // 2, image.shape[0] // 2
        
        return {
            'mask_binary': mask_binary,
            'mask_confidence': mask_float,
            'bounding_box': bounding_box,
            'centroid': {'x': cx, 'y': cy},
            'body_area': np.sum(mask_binary > 0)
        }
    
    def close(self):
        self.segmenter.close()
```

### 3.3 MediaPipe Pose for Body Landmarks (Optional Enhancement)

```python
import mediapipe as mp

class PoseLandmarkDetector:
    """
    Detect body pose landmarks for detailed segmentation.
    """
    
    # Key landmark indices
    LANDMARKS = {
        'nose': 0,
        'left_eye_inner': 1,
        'left_eye': 2,
        'left_eye_outer': 3,
        'right_eye_inner': 4,
        'right_eye': 5,
        'right_eye_outer': 6,
        'left_ear': 7,
        'right_ear': 8,
        'mouth_left': 9,
        'mouth_right': 10,
        'left_shoulder': 11,
        'right_shoulder': 12,
        'left_elbow': 13,
        'right_elbow': 14,
        'left_wrist': 15,
        'right_wrist': 16,
        'left_pinky': 17,
        'right_pinky': 18,
        'left_index': 19,
        'right_index': 20,
        'left_thumb': 21,
        'right_thumb': 22,
        'left_hip': 23,
        'right_hip': 24,
        'left_knee': 25,
        'right_knee': 26,
        'left_ankle': 27,
        'right_ankle': 28,
        'left_heel': 29,
        'right_heel': 30,
        'left_foot_index': 31,
        'right_foot_index': 32
    }
    
    # Body part groupings
    BODY_PARTS = {
        'head': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        'torso': [11, 12, 23, 24],
        'left_arm': [11, 13, 15, 17, 19, 21],
        'right_arm': [12, 14, 16, 18, 20, 22],
        'left_leg': [23, 25, 27, 29, 31],
        'right_leg': [24, 26, 28, 30, 32]
    }
    
    def __init__(self, min_detection_confidence=0.5, min_tracking_confidence=0.5):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )
    
    def detect(self, image: np.ndarray) -> dict:
        """
        Detect pose landmarks.
        
        Returns:
            dict with landmarks, body_parts, visibility scores
        """
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.pose.process(image_rgb)
        
        if not results.pose_landmarks:
            return None
        
        h, w = image.shape[:2]
        landmarks = {}
        
        for name, idx in self.LANDMARKS.items():
            lm = results.pose_landmarks.landmark[idx]
            landmarks[name] = {
                'x': int(lm.x * w),
                'y': int(lm.y * h),
                'z': lm.z,
                'visibility': lm.visibility
            }
        
        # Calculate body midline (vertical axis of symmetry)
        left_shoulder = landmarks['left_shoulder']
        right_shoulder = landmarks['right_shoulder']
        left_hip = landmarks['left_hip']
        right_hip = landmarks['right_hip']
        
        midline_x = (
            left_shoulder['x'] + right_shoulder['x'] +
            left_hip['x'] + right_hip['x']
        ) // 4
        
        return {
            'landmarks': landmarks,
            'midline_x': midline_x,
            'pose_detected': True
        }
    
    def create_body_part_mask(self, image_shape: tuple, landmarks: dict, 
                              body_part: str) -> np.ndarray:
        """
        Create mask for specific body part using landmarks.
        """
        h, w = image_shape[:2]
        mask = np.zeros((h, w), dtype=np.uint8)
        
        if body_part not in self.BODY_PARTS:
            return mask
        
        indices = self.BODY_PARTS[body_part]
        points = []
        
        for name, idx in self.LANDMARKS.items():
            if idx in indices:
                lm = landmarks.get(name)
                if lm and lm['visibility'] > 0.5:
                    points.append([lm['x'], lm['y']])
        
        if len(points) >= 3:
            hull = cv2.convexHull(np.array(points))
            cv2.fillConvexPoly(mask, hull, 255)
        
        return mask
```

---

## 4. Face Segmentation

### 4.1 Technology: MediaPipe Face Mesh (MANDATORY)

**Use MediaPipe Face Mesh exclusively for face segmentation.**

Key characteristics:
- 468 facial landmarks for precise region detection
- Real-time capable in browser and Python
- Includes iris landmarks with `refine_landmarks=True`
- Enables detailed facial region analysis

### 4.2 MediaPipe Face Mesh Implementation

```python
import mediapipe as mp
import numpy as np

class FaceSegmenter:
    """
    MediaPipe Face Mesh based face segmentation.
    """
    
    # Key facial regions defined by landmark indices
    FACE_REGIONS = {
        'face_oval': [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
            172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
        ],
        'left_eye': [
            33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158,
            159, 160, 161, 246
        ],
        'right_eye': [
            362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387,
            386, 385, 384, 398
        ],
        'left_eyebrow': [
            276, 283, 282, 295, 285, 300, 293, 334, 296, 336
        ],
        'right_eyebrow': [
            46, 53, 52, 65, 55, 70, 63, 105, 66, 107
        ],
        'nose': [
            168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 164, 0, 11, 12,
            13, 14, 15, 16, 17, 18, 200, 199, 175
        ],
        'upper_lip': [
            61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308,
            415, 310, 311, 312, 13, 82, 81, 80, 191, 78
        ],
        'lower_lip': [
            61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308,
            324, 318, 402, 317, 14, 87, 178, 88, 95, 78
        ],
        'left_cheek': [
            234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152
        ],
        'right_cheek': [
            454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152
        ],
        'forehead': [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
            172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
        ],
        'chin': [
            152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
            162, 21, 54, 103, 67, 109, 10
        ]
    }
    
    # Symmetry pairs for comparison
    SYMMETRY_PAIRS = [
        ('left_eye', 'right_eye'),
        ('left_eyebrow', 'right_eyebrow'),
        ('left_cheek', 'right_cheek')
    ]
    
    def __init__(self, max_faces=1, min_detection_confidence=0.5):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=max_faces,
            refine_landmarks=True,  # Includes iris landmarks
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=0.5
        )
    
    def detect(self, image: np.ndarray) -> dict:
        """
        Detect face landmarks.
        
        Returns:
            dict with landmarks, regions, face_detected
        """
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(image_rgb)
        
        if not results.multi_face_landmarks:
            return {'face_detected': False}
        
        h, w = image.shape[:2]
        face_landmarks = results.multi_face_landmarks[0]
        
        # Convert to pixel coordinates
        landmarks = []
        for lm in face_landmarks.landmark:
            landmarks.append({
                'x': int(lm.x * w),
                'y': int(lm.y * h),
                'z': lm.z
            })
        
        # Calculate face midline
        nose_tip = landmarks[4]
        midline_x = nose_tip['x']
        
        return {
            'face_detected': True,
            'landmarks': landmarks,
            'midline_x': midline_x,
            'face_count': len(results.multi_face_landmarks)
        }
    
    def create_region_mask(self, image_shape: tuple, landmarks: list, 
                           region: str) -> np.ndarray:
        """
        Create binary mask for a facial region.
        
        Args:
            image_shape: (height, width, channels)
            landmarks: List of landmark dicts with x, y
            region: Name of region from FACE_REGIONS
            
        Returns:
            Binary mask (0 or 255)
        """
        h, w = image_shape[:2]
        mask = np.zeros((h, w), dtype=np.uint8)
        
        if region not in self.FACE_REGIONS:
            return mask
        
        indices = self.FACE_REGIONS[region]
        points = np.array([
            [landmarks[i]['x'], landmarks[i]['y']] 
            for i in indices
        ], dtype=np.int32)
        
        cv2.fillPoly(mask, [points], 255)
        
        return mask
    
    def create_all_region_masks(self, image_shape: tuple, 
                                landmarks: list) -> dict:
        """
        Create masks for all facial regions.
        
        Returns:
            dict mapping region name to binary mask
        """
        masks = {}
        for region in self.FACE_REGIONS:
            masks[region] = self.create_region_mask(image_shape, landmarks, region)
        return masks
    
    def get_face_bounding_box(self, landmarks: list) -> dict:
        """
        Get bounding box around face.
        """
        xs = [lm['x'] for lm in landmarks]
        ys = [lm['y'] for lm in landmarks]
        
        padding = 20  # pixels
        
        return {
            'x': max(0, min(xs) - padding),
            'y': max(0, min(ys) - padding),
            'width': max(xs) - min(xs) + 2 * padding,
            'height': max(ys) - min(ys) + 2 * padding
        }
```

### 4.3 Face Zones Definition

```
┌─────────────────────────────────────────────┐
│                                             │
│   FACE FIELD (Zone around face)             │
│                                             │
│     ┌─────────────────────────────────┐     │
│     │         FOREHEAD                │     │
│     │    ┌─────────┬─────────┐       │     │
│     │    │ L.BROW  │ R.BROW  │       │     │
│     │    ├─────────┼─────────┤       │     │
│     │    │ L.EYE   │ R.EYE   │       │     │
│     │    ├─────────┴─────────┤       │     │
│     │    │       NOSE        │       │     │
│     │    ├─────────┬─────────┤       │     │
│     │    │ L.CHEEK │ R.CHEEK │       │     │
│     │    ├─────────┴─────────┤       │     │
│     │    │       MOUTH       │       │     │
│     │    ├───────────────────┤       │     │
│     │    │       CHIN        │       │     │
│     │    └───────────────────┘       │     │
│     │                                 │     │
│     └─────────────────────────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 5. Zone Definition System

### 5.1 Zone Creation from Body Mask

```python
class ZoneCreator:
    """
    Create analysis zones from body segmentation mask.
    """
    
    # Default zone distances (relative to body size)
    DEFAULT_ZONES = {
        'proximal': 0.1,   # 10% of body diagonal
        'distal': 0.2,     # 20% of body diagonal
        'extended': 0.35   # 35% of body diagonal
    }
    
    def __init__(self, zone_config: dict = None):
        """
        Initialize zone creator.
        
        Args:
            zone_config: Custom zone distances (relative or absolute)
        """
        self.zone_config = zone_config or self.DEFAULT_ZONES
    
    def create_zones(self, body_mask: np.ndarray, 
                     mode: str = 'relative') -> dict:
        """
        Create all analysis zones from body mask.
        
        Args:
            body_mask: Binary mask (255 = body, 0 = background)
            mode: 'relative' (to body size) or 'absolute' (pixels)
            
        Returns:
            dict with zone masks and metadata
        """
        h, w = body_mask.shape[:2]
        
        # Calculate body diagonal for relative sizing
        contours, _ = cv2.findContours(
            body_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            return None
        
        largest = max(contours, key=cv2.contourArea)
        x, y, bw, bh = cv2.boundingRect(largest)
        body_diagonal = np.sqrt(bw**2 + bh**2)
        
        # Calculate zone distances
        if mode == 'relative':
            proximal_dist = int(body_diagonal * self.zone_config['proximal'])
            distal_dist = int(body_diagonal * self.zone_config['distal'])
            extended_dist = int(body_diagonal * self.zone_config['extended'])
        else:
            proximal_dist = self.zone_config.get('proximal_px', 30)
            distal_dist = self.zone_config.get('distal_px', 60)
            extended_dist = self.zone_config.get('extended_px', 100)
        
        # Create zone masks using morphological dilation
        kernel_proximal = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE, (proximal_dist * 2 + 1, proximal_dist * 2 + 1)
        )
        kernel_distal = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE, (distal_dist * 2 + 1, distal_dist * 2 + 1)
        )
        kernel_extended = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE, (extended_dist * 2 + 1, extended_dist * 2 + 1)
        )
        
        # Dilate to create expanded regions
        dilated_proximal = cv2.dilate(body_mask, kernel_proximal)
        dilated_distal = cv2.dilate(body_mask, kernel_distal)
        dilated_extended = cv2.dilate(body_mask, kernel_extended)
        
        # Create zone masks (annular regions)
        zone_body = body_mask.copy()
        zone_proximal = cv2.subtract(dilated_proximal, body_mask)
        zone_distal = cv2.subtract(dilated_distal, dilated_proximal)
        zone_extended = cv2.subtract(dilated_extended, dilated_distal)
        zone_background = cv2.bitwise_not(dilated_extended)
        
        # Calculate zone areas
        zones = {
            'body': {
                'mask': zone_body,
                'area': np.sum(zone_body > 0),
                'zone_id': 1
            },
            'proximal_field': {
                'mask': zone_proximal,
                'area': np.sum(zone_proximal > 0),
                'zone_id': 2,
                'distance_from_body': f"0-{proximal_dist}px"
            },
            'distal_field': {
                'mask': zone_distal,
                'area': np.sum(zone_distal > 0),
                'zone_id': 3,
                'distance_from_body': f"{proximal_dist}-{distal_dist}px"
            },
            'extended_field': {
                'mask': zone_extended,
                'area': np.sum(zone_extended > 0),
                'zone_id': 4,
                'distance_from_body': f"{distal_dist}-{extended_dist}px"
            },
            'background': {
                'mask': zone_background,
                'area': np.sum(zone_background > 0),
                'zone_id': 5
            }
        }
        
        # Combined field mask (proximal + distal + extended)
        combined_field = cv2.bitwise_or(zone_proximal, zone_distal)
        combined_field = cv2.bitwise_or(combined_field, zone_extended)
        zones['combined_field'] = {
            'mask': combined_field,
            'area': np.sum(combined_field > 0),
            'zone_id': 0  # Special combined zone
        }
        
        # Metadata
        zones['_metadata'] = {
            'body_diagonal': body_diagonal,
            'body_bounding_box': {'x': x, 'y': y, 'width': bw, 'height': bh},
            'zone_distances': {
                'proximal': proximal_dist,
                'distal': distal_dist,
                'extended': extended_dist
            },
            'image_size': {'width': w, 'height': h}
        }
        
        return zones
    
    def visualize_zones(self, image: np.ndarray, zones: dict) -> np.ndarray:
        """
        Create visualization overlay of zones.
        
        Returns:
            Image with colored zone overlay
        """
        overlay = image.copy()
        
        # Zone colors (BGR)
        colors = {
            'body': (0, 255, 0),           # Green
            'proximal_field': (0, 255, 255),  # Yellow
            'distal_field': (0, 165, 255),    # Orange
            'extended_field': (0, 0, 255),    # Red
            'background': (128, 128, 128)     # Gray
        }
        
        alpha = 0.3
        
        for zone_name, zone_data in zones.items():
            if zone_name.startswith('_') or zone_name == 'combined_field':
                continue
            
            mask = zone_data['mask']
            color = colors.get(zone_name, (255, 255, 255))
            
            colored = np.zeros_like(overlay)
            colored[mask > 0] = color
            
            overlay = cv2.addWeighted(overlay, 1, colored, alpha, 0)
        
        return overlay
```

### 5.2 Zone Configuration Options

```python
# Example zone configurations for different use cases

# Standard wellness analysis
STANDARD_ZONES = {
    'proximal': 0.08,   # Close aura
    'distal': 0.15,     # Mid aura
    'extended': 0.25    # Outer aura
}

# Detailed chakra analysis (closer zones)
CHAKRA_ZONES = {
    'proximal': 0.05,
    'distal': 0.10,
    'extended': 0.18
}

# Research mode (more zones)
RESEARCH_ZONES = {
    'zone_1': 0.03,
    'zone_2': 0.06,
    'zone_3': 0.10,
    'zone_4': 0.15,
    'zone_5': 0.22,
    'zone_6': 0.30
}

# Face-specific zones (tighter)
FACE_ZONES = {
    'proximal': 0.12,
    'distal': 0.25,
    'extended': 0.40
}
```

---

## 6. Multi-Zone Symmetry Analysis

### 6.1 Symmetry Calculator

```python
from skimage.metrics import structural_similarity as ssim
import numpy as np
import cv2

class MultiZoneSymmetryAnalyzer:
    """
    Calculate symmetry metrics for multiple zones.
    """
    
    def __init__(self):
        pass
    
    def calculate_zone_symmetry(self, image: np.ndarray, 
                                 mask: np.ndarray,
                                 midline_x: int = None) -> dict:
        """
        Calculate symmetry within a zone.
        
        Args:
            image: Input image (grayscale or color)
            mask: Zone mask (binary)
            midline_x: X coordinate of vertical midline (None = image center)
            
        Returns:
            dict with symmetry metrics
        """
        h, w = image.shape[:2]
        
        if midline_x is None:
            midline_x = w // 2
        
        # Ensure grayscale for SSIM
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Apply mask
        masked = cv2.bitwise_and(gray, gray, mask=mask)
        
        # Split into left and right at midline
        left = masked[:, :midline_x]
        right = masked[:, midline_x:2*midline_x] if midline_x * 2 <= w else masked[:, midline_x:]
        
        # Flip right for comparison
        right_flipped = np.fliplr(right)
        
        # Ensure same size
        min_width = min(left.shape[1], right_flipped.shape[1])
        left = left[:, :min_width]
        right_flipped = right_flipped[:, :min_width]
        
        # Also need matching masks
        left_mask = mask[:, :midline_x][:, :min_width]
        right_mask = np.fliplr(mask[:, midline_x:2*midline_x] if midline_x * 2 <= w else mask[:, midline_x:])[:, :min_width]
        
        # Combined mask (only compare where both sides have data)
        combined_mask = cv2.bitwise_and(left_mask, right_mask)
        
        if np.sum(combined_mask) < 100:  # Minimum pixels required
            return {
                'correlation': 0,
                'ssim': 0,
                'mae': 1.0,
                'combined': 0,
                'valid': False
            }
        
        # Extract valid pixels
        left_pixels = left[combined_mask > 0]
        right_pixels = right_flipped[combined_mask > 0]
        
        # Calculate metrics
        
        # 1. Correlation coefficient
        if len(left_pixels) > 0 and np.std(left_pixels) > 0 and np.std(right_pixels) > 0:
            correlation = np.corrcoef(left_pixels, right_pixels)[0, 1]
        else:
            correlation = 0
        
        # 2. SSIM (structural similarity)
        try:
            # Create cropped images for SSIM
            rows = np.any(combined_mask, axis=1)
            cols = np.any(combined_mask, axis=0)
            rmin, rmax = np.where(rows)[0][[0, -1]]
            cmin, cmax = np.where(cols)[0][[0, -1]]
            
            left_crop = left[rmin:rmax+1, cmin:cmax+1]
            right_crop = right_flipped[rmin:rmax+1, cmin:cmax+1]
            
            if left_crop.size > 0 and right_crop.size > 0:
                ssim_score = ssim(left_crop, right_crop, data_range=255)
            else:
                ssim_score = 0
        except Exception:
            ssim_score = 0
        
        # 3. Mean Absolute Error (lower is more symmetric)
        mae = np.mean(np.abs(left_pixels.astype(float) - right_pixels.astype(float))) / 255
        
        # 4. Combined score
        combined = (
            0.4 * max(0, correlation) +
            0.4 * max(0, ssim_score) +
            0.2 * (1 - mae)
        )
        
        return {
            'correlation': float(correlation) if not np.isnan(correlation) else 0,
            'ssim': float(ssim_score),
            'mae': float(mae),
            'combined': float(combined),
            'valid': True,
            'pixels_compared': int(np.sum(combined_mask > 0))
        }
    
    def analyze_all_zones(self, image: np.ndarray, zones: dict,
                          midline_x: int = None) -> dict:
        """
        Calculate symmetry for all zones.
        
        Args:
            image: Input image
            zones: Zone dict from ZoneCreator
            midline_x: Vertical midline X coordinate
            
        Returns:
            dict with symmetry results per zone
        """
        results = {}
        
        for zone_name, zone_data in zones.items():
            if zone_name.startswith('_') or 'mask' not in zone_data:
                continue
            
            symmetry = self.calculate_zone_symmetry(
                image, zone_data['mask'], midline_x
            )
            results[zone_name] = symmetry
        
        # Calculate overall scores
        if 'body' in results and 'combined_field' in results:
            body_sym = results['body']['combined']
            field_sym = results['combined_field']['combined']
            
            results['_summary'] = {
                'inner_symmetry': body_sym,
                'outer_symmetry': field_sym,
                'overall_symmetry': 0.5 * body_sym + 0.5 * field_sym,
                'body_field_difference': abs(body_sym - field_sym)
            }
        
        return results
    
    def calculate_color_symmetry(self, image_rgb: np.ndarray,
                                  mask: np.ndarray,
                                  midline_x: int = None) -> dict:
        """
        Calculate color-based symmetry (comparing color distributions).
        
        Args:
            image_rgb: RGB image
            mask: Zone mask
            midline_x: Vertical midline
            
        Returns:
            dict with color symmetry metrics
        """
        h, w = image_rgb.shape[:2]
        
        if midline_x is None:
            midline_x = w // 2
        
        # Convert to HSV
        hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
        
        # Split masks
        left_mask = mask[:, :midline_x]
        right_mask = mask[:, midline_x:]
        
        # Calculate histograms for each half
        left_hsv = hsv[:, :midline_x]
        right_hsv = hsv[:, midline_x:]
        
        # Hue histogram comparison
        left_hue_hist = cv2.calcHist(
            [left_hsv], [0], left_mask, [30], [0, 180]
        )
        right_hue_hist = cv2.calcHist(
            [right_hsv], [0], right_mask, [30], [0, 180]
        )
        
        # Normalize
        left_hue_hist = cv2.normalize(left_hue_hist, left_hue_hist).flatten()
        right_hue_hist = cv2.normalize(right_hue_hist, right_hue_hist).flatten()
        
        # Compare histograms
        hue_correlation = cv2.compareHist(
            left_hue_hist, right_hue_hist, cv2.HISTCMP_CORREL
        )
        
        # Saturation histogram comparison
        left_sat_hist = cv2.calcHist(
            [left_hsv], [1], left_mask, [32], [0, 256]
        )
        right_sat_hist = cv2.calcHist(
            [right_hsv], [1], right_mask, [32], [0, 256]
        )
        
        left_sat_hist = cv2.normalize(left_sat_hist, left_sat_hist).flatten()
        right_sat_hist = cv2.normalize(right_sat_hist, right_sat_hist).flatten()
        
        sat_correlation = cv2.compareHist(
            left_sat_hist, right_sat_hist, cv2.HISTCMP_CORREL
        )
        
        # Combined color symmetry
        color_symmetry = (
            0.6 * max(0, hue_correlation) +
            0.4 * max(0, sat_correlation)
        )
        
        return {
            'hue_symmetry': float(hue_correlation),
            'saturation_symmetry': float(sat_correlation),
            'combined_color_symmetry': float(color_symmetry)
        }
```

### 6.2 Comprehensive Symmetry Score

```python
class SymmetryScoreCalculator:
    """
    Calculate final symmetry score combining all components.
    """
    
    # Component weights for final score
    WEIGHTS = {
        'inner_intensity': 0.25,      # Body intensity symmetry
        'inner_color': 0.15,          # Body color symmetry
        'outer_intensity': 0.20,      # Field intensity symmetry
        'outer_color': 0.15,          # Field color symmetry
        'contour': 0.15,              # Contour complexity balance
        'field_body_relationship': 0.10  # How field relates to body on each side
    }
    
    def __init__(self, zone_analyzer: MultiZoneSymmetryAnalyzer):
        self.zone_analyzer = zone_analyzer
    
    def calculate_comprehensive_symmetry(self, 
                                          image: np.ndarray,
                                          image_rgb: np.ndarray,
                                          zones: dict,
                                          midline_x: int) -> dict:
        """
        Calculate comprehensive symmetry score.
        
        Args:
            image: Grayscale image
            image_rgb: RGB image
            zones: Zone masks dict
            midline_x: Vertical midline X coordinate
            
        Returns:
            dict with all symmetry metrics and final score
        """
        results = {}
        
        # 1. Inner (body) intensity symmetry
        body_intensity_sym = self.zone_analyzer.calculate_zone_symmetry(
            image, zones['body']['mask'], midline_x
        )
        results['inner_intensity'] = body_intensity_sym['combined']
        
        # 2. Inner (body) color symmetry
        body_color_sym = self.zone_analyzer.calculate_color_symmetry(
            image_rgb, zones['body']['mask'], midline_x
        )
        results['inner_color'] = body_color_sym['combined_color_symmetry']
        
        # 3. Outer (field) intensity symmetry
        field_intensity_sym = self.zone_analyzer.calculate_zone_symmetry(
            image, zones['combined_field']['mask'], midline_x
        )
        results['outer_intensity'] = field_intensity_sym['combined']
        
        # 4. Outer (field) color symmetry
        field_color_sym = self.zone_analyzer.calculate_color_symmetry(
            image_rgb, zones['combined_field']['mask'], midline_x
        )
        results['outer_color'] = field_color_sym['combined_color_symmetry']
        
        # 5. Contour complexity balance
        contour_balance = self._calculate_contour_balance(
            zones['body']['mask'], midline_x
        )
        results['contour'] = contour_balance
        
        # 6. Field-body relationship symmetry
        field_body_rel = self._calculate_field_body_relationship(
            image, zones, midline_x
        )
        results['field_body_relationship'] = field_body_rel
        
        # Calculate final weighted score
        final_score = sum(
            self.WEIGHTS[key] * results[key]
            for key in self.WEIGHTS
        )
        
        results['final_score'] = final_score
        results['final_score_100'] = int(final_score * 100)
        
        # Additional metadata
        results['_components'] = {
            'inner_symmetry': (results['inner_intensity'] + results['inner_color']) / 2,
            'outer_symmetry': (results['outer_intensity'] + results['outer_color']) / 2
        }
        
        return results
    
    def _calculate_contour_balance(self, body_mask: np.ndarray, 
                                    midline_x: int) -> float:
        """
        Calculate balance of contour complexity between left and right.
        """
        # Split mask
        left_mask = body_mask[:, :midline_x]
        right_mask = body_mask[:, midline_x:]
        
        # Find contours on each side
        left_contours, _ = cv2.findContours(
            left_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE
        )
        right_contours, _ = cv2.findContours(
            right_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE
        )
        
        if not left_contours or not right_contours:
            return 0.5
        
        # Calculate perimeter (proxy for complexity)
        left_perimeter = sum(cv2.arcLength(c, True) for c in left_contours)
        right_perimeter = sum(cv2.arcLength(c, True) for c in right_contours)
        
        # Balance score (1.0 = perfectly balanced)
        if max(left_perimeter, right_perimeter) > 0:
            balance = min(left_perimeter, right_perimeter) / max(left_perimeter, right_perimeter)
        else:
            balance = 0.5
        
        return balance
    
    def _calculate_field_body_relationship(self, image: np.ndarray,
                                            zones: dict,
                                            midline_x: int) -> float:
        """
        Calculate how similarly the field relates to body on each side.
        """
        body_mask = zones['body']['mask']
        field_mask = zones['proximal_field']['mask']
        
        # Calculate intensity ratio: field / body for each side
        h, w = image.shape[:2]
        
        # Left side
        left_body_mask = body_mask[:, :midline_x]
        left_field_mask = field_mask[:, :midline_x]
        left_body_intensity = np.mean(image[:, :midline_x][left_body_mask > 0]) if np.sum(left_body_mask) > 0 else 0
        left_field_intensity = np.mean(image[:, :midline_x][left_field_mask > 0]) if np.sum(left_field_mask) > 0 else 0
        
        left_ratio = left_field_intensity / (left_body_intensity + 1e-6)
        
        # Right side
        right_body_mask = body_mask[:, midline_x:]
        right_field_mask = field_mask[:, midline_x:]
        right_body_intensity = np.mean(image[:, midline_x:][right_body_mask > 0]) if np.sum(right_body_mask) > 0 else 0
        right_field_intensity = np.mean(image[:, midline_x:][right_field_mask > 0]) if np.sum(right_field_mask) > 0 else 0
        
        right_ratio = right_field_intensity / (right_body_intensity + 1e-6)
        
        # Similarity of ratios (1.0 = identical relationship)
        if max(left_ratio, right_ratio) > 0:
            relationship_symmetry = min(left_ratio, right_ratio) / max(left_ratio, right_ratio)
        else:
            relationship_symmetry = 0.5
        
        return relationship_symmetry
```

---

## 7. Implementation Architecture

### 7.1 Processing Pipeline (MediaPipe-Based)

```
Input Frame
     │
     ▼
┌─────────────────────────────────────────────────────┐
│              SEGMENTATION STAGE                      │
│                                                      │
│  ┌─────────────┐    ┌─────────────┐                 │
│  │   Body      │    │   Face      │                 │
│  │ Segmenter   │    │ Segmenter   │                 │
│  │ (MediaPipe) │    │ (MediaPipe) │                 │
│  └──────┬──────┘    └──────┬──────┘                 │
│         │                   │                        │
│         ▼                   ▼                        │
│  ┌─────────────┐    ┌─────────────┐                 │
│  │ Body Mask   │    │ Face Mask   │                 │
│  │ + Landmarks │    │ + Landmarks │                 │
│  └──────┬──────┘    └──────┬──────┘                 │
└─────────┼───────────────────┼───────────────────────┘
          │                   │
          ▼                   ▼
┌─────────────────────────────────────────────────────┐
│               ZONE CREATION STAGE                    │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │              Zone Creator                    │    │
│  │  - Body (Zone 1)                            │    │
│  │  - Proximal Field (Zone 2)                  │    │
│  │  - Distal Field (Zone 3)                    │    │
│  │  - Background (Zone 4)                      │    │
│  └──────────────────┬──────────────────────────┘    │
└─────────────────────┼───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              ANALYSIS STAGE                          │
│                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   Zone 1    │ │   Zone 2    │ │   Zone 3    │   │
│  │  Metrics    │ │  Metrics    │ │  Metrics    │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘   │
│         │               │               │           │
│         └───────────────┼───────────────┘           │
│                         ▼                           │
│  ┌─────────────────────────────────────────────┐   │
│  │         Multi-Zone Symmetry Analyzer         │   │
│  │  - Inner symmetry (body)                    │   │
│  │  - Outer symmetry (field)                   │   │
│  │  - Color symmetry per zone                  │   │
│  │  - Contour balance                          │   │
│  │  - Field-body relationship                  │   │
│  └──────────────────┬──────────────────────────┘   │
└─────────────────────┼───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              SCORING STAGE                           │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │         Comprehensive Score Calculator       │   │
│  │  - Final symmetry score                     │   │
│  │  - Per-zone scores                          │   │
│  │  - Component breakdown                      │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 7.2 Frontend Integration (Real-Time with MediaPipe)

```typescript
// Simplified real-time segmentation using TensorFlow.js MediaPipe

interface SegmentationService {
  // Initialize models
  initialize(): Promise<void>;
  
  // Process frame and return zones
  processFrame(imageData: ImageData): Promise<FrameZones>;
  
  // Calculate real-time symmetry (simplified)
  calculateQuickSymmetry(imageData: ImageData, zones: FrameZones): SymmetryResult;
}

interface FrameZones {
  bodyMask: Uint8Array;
  fieldMask: Uint8Array;
  midlineX: number;
  boundingBox: BoundingBox;
}

interface SymmetryResult {
  innerSymmetry: number;
  outerSymmetry: number;
  overallSymmetry: number;
}

// Usage in render loop
async function processVideoFrame(frame: ImageData) {
  // 1. Get segmentation (runs on GPU via TensorFlow.js)
  const zones = await segmentationService.processFrame(frame);
  
  // 2. Quick symmetry calculation
  const symmetry = segmentationService.calculateQuickSymmetry(frame, zones);
  
  // 3. Update UI
  updateSymmetryDisplay(symmetry);
  
  // 4. Draw zone overlay (optional)
  if (showZoneOverlay) {
    drawZoneVisualization(zones);
  }
}
```

### 7.3 Backend Integration (Detailed Analysis with MediaPipe)

```python
class PIPAnalysisPipeline:
    """
    Complete analysis pipeline for captured frames.
    """
    
    def __init__(self):
        self.body_segmenter = BodySegmenter()
        self.face_segmenter = FaceSegmenter()
        self.zone_creator = ZoneCreator()
        self.symmetry_analyzer = MultiZoneSymmetryAnalyzer()
        self.symmetry_scorer = SymmetryScoreCalculator(self.symmetry_analyzer)
    
    def analyze(self, image: np.ndarray, mode: str = 'full_body') -> dict:
        """
        Run complete analysis pipeline.
        
        Args:
            image: BGR image
            mode: 'full_body' or 'face'
            
        Returns:
            Complete analysis results
        """
        results = {}
        
        # 1. Segmentation
        if mode == 'full_body':
            seg_result = self.body_segmenter.segment(image)
            body_mask = seg_result['mask_binary']
            midline_x = seg_result['centroid']['x']
        else:
            seg_result = self.face_segmenter.detect(image)
            if not seg_result['face_detected']:
                return {'error': 'No face detected'}
            # Create face mask
            body_mask = self.face_segmenter.create_region_mask(
                image.shape, seg_result['landmarks'], 'face_oval'
            )
            midline_x = seg_result['midline_x']
        
        results['segmentation'] = seg_result
        
        # 2. Create zones
        zones = self.zone_creator.create_zones(body_mask)
        results['zones'] = {
            k: {'area': v['area'], 'zone_id': v.get('zone_id')}
            for k, v in zones.items() if not k.startswith('_')
        }
        results['zone_metadata'] = zones['_metadata']
        
        # 3. Per-zone metrics
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        zone_metrics = {}
        for zone_name, zone_data in zones.items():
            if zone_name.startswith('_') or 'mask' not in zone_data:
                continue
            
            zone_metrics[zone_name] = self._calculate_zone_metrics(
                gray, rgb, zone_data['mask']
            )
        
        results['zone_metrics'] = zone_metrics
        
        # 4. Multi-zone symmetry analysis
        symmetry_results = self.symmetry_scorer.calculate_comprehensive_symmetry(
            gray, rgb, zones, midline_x
        )
        results['symmetry'] = symmetry_results
        
        # 5. Generate visualization
        visualization = self.zone_creator.visualize_zones(image, zones)
        results['visualization'] = visualization
        
        return results
    
    def _calculate_zone_metrics(self, gray: np.ndarray, 
                                 rgb: np.ndarray,
                                 mask: np.ndarray) -> dict:
        """
        Calculate metrics for a single zone.
        """
        if np.sum(mask) == 0:
            return {'valid': False}
        
        masked_gray = gray[mask > 0]
        masked_rgb = rgb[mask > 0]
        
        return {
            'valid': True,
            'avg_intensity': float(np.mean(masked_gray)),
            'std_intensity': float(np.std(masked_gray)),
            'min_intensity': float(np.min(masked_gray)),
            'max_intensity': float(np.max(masked_gray)),
            'pixel_count': int(np.sum(mask > 0)),
            'avg_hue': float(np.mean(cv2.cvtColor(
                rgb, cv2.COLOR_RGB2HSV
            )[:,:,0][mask > 0])),
            'avg_saturation': float(np.mean(cv2.cvtColor(
                rgb, cv2.COLOR_RGB2HSV
            )[:,:,1][mask > 0]))
        }
```

---

## 8. API Updates

### 8.1 Updated Analysis Response Schema

```typescript
interface AnalysisResponse {
  id: string;
  timestamp: string;
  mode: 'full_body' | 'face';
  
  // Segmentation info
  segmentation: {
    body_detected: boolean;
    midline_x: number;
    bounding_box: BoundingBox;
    body_area: number;
  };
  
  // Zone information
  zones: {
    body: ZoneInfo;
    proximal_field: ZoneInfo;
    distal_field: ZoneInfo;
    extended_field: ZoneInfo;
    background: ZoneInfo;
  };
  
  // Per-zone metrics
  zone_metrics: {
    [zoneName: string]: ZoneMetrics;
  };
  
  // Multi-zone symmetry
  symmetry: {
    inner_intensity: number;     // Body intensity symmetry
    inner_color: number;         // Body color symmetry
    outer_intensity: number;     // Field intensity symmetry
    outer_color: number;         // Field color symmetry
    contour: number;             // Contour balance
    field_body_relationship: number;
    final_score: number;         // 0-1
    final_score_100: number;     // 0-100
    
    _components: {
      inner_symmetry: number;    // Combined inner
      outer_symmetry: number;    // Combined outer
    };
  };
  
  // Updated composite scores (includes new symmetry)
  scores: {
    energy: number;
    symmetry: number;      // Now uses multi-zone calculation
    coherence: number;
    complexity: number;
    regulation: number;
    colorBalance: number;
  };
  
  // Visualization URLs
  images: {
    original: string;
    processed: string;
    zone_overlay: string;    // New: zone visualization
    symmetry_heatmap: string; // New: symmetry visualization
  };
}

interface ZoneInfo {
  area: number;
  zone_id: number;
  distance_from_body?: string;
}

interface ZoneMetrics {
  valid: boolean;
  avg_intensity: number;
  std_intensity: number;
  min_intensity: number;
  max_intensity: number;
  pixel_count: number;
  avg_hue: number;
  avg_saturation: number;
}
```

### 8.2 Updated Symmetry Score Formula

```python
def calculate_symmetry_score(symmetry_results: dict) -> int:
    """
    Calculate final symmetry score (0-100) from multi-zone analysis.
    
    Components:
    - Inner symmetry (body): 40%
    - Outer symmetry (field): 35%
    - Contour balance: 15%
    - Field-body relationship: 10%
    """
    inner_sym = (
        symmetry_results['inner_intensity'] * 0.6 +
        symmetry_results['inner_color'] * 0.4
    )
    
    outer_sym = (
        symmetry_results['outer_intensity'] * 0.6 +
        symmetry_results['outer_color'] * 0.4
    )
    
    score = (
        0.40 * inner_sym +
        0.35 * outer_sym +
        0.15 * symmetry_results['contour'] +
        0.10 * symmetry_results['field_body_relationship']
    )
    
    return int(score * 100)
```

---

## 9. Additional Considerations

### 9.1 Performance Optimization (MediaPipe Focus)

| Stage | Frontend (Real-time) | Backend (Detailed) |
|-------|---------------------|-------------------|
| Segmentation | MediaPipe via TensorFlow.js (GPU) | MediaPipe Python |
| Zone Creation | Simple dilation (OpenCV.js or canvas) | Full morphological ops (OpenCV) |
| Symmetry | Quick correlation | SSIM + color analysis |
| Target FPS | 15-30 | N/A (batch) |
| Target Latency | < 100ms | < 3s |

**Note:** All segmentation uses MediaPipe exclusively. Do not substitute with other models.

### 9.2 Handling Edge Cases

```python
class EdgeCaseHandler:
    """
    Handle edge cases in segmentation and analysis.
    """
    
    @staticmethod
    def handle_no_body_detected(image: np.ndarray) -> dict:
        """
        Fallback when no body is detected.
        Use center region as pseudo-body.
        """
        h, w = image.shape[:2]
        
        # Create center region mask
        center_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.ellipse(
            center_mask,
            (w // 2, h // 2),
            (w // 4, h // 3),
            0, 0, 360, 255, -1
        )
        
        return {
            'mask_binary': center_mask,
            'centroid': {'x': w // 2, 'y': h // 2},
            'fallback_used': True
        }
    
    @staticmethod
    def handle_partial_body(body_mask: np.ndarray, 
                            image_shape: tuple) -> dict:
        """
        Handle cases where body is partially in frame.
        """
        h, w = image_shape[:2]
        
        # Check which edges the body touches
        touches_left = np.any(body_mask[:, 0] > 0)
        touches_right = np.any(body_mask[:, -1] > 0)
        touches_top = np.any(body_mask[0, :] > 0)
        touches_bottom = np.any(body_mask[-1, :] > 0)
        
        # Adjust analysis based on visible portion
        return {
            'partial_body': True,
            'touches_edges': {
                'left': touches_left,
                'right': touches_right,
                'top': touches_top,
                'bottom': touches_bottom
            },
            'symmetry_valid': not (touches_left != touches_right),
            'recommendation': 'Center subject in frame for accurate symmetry analysis'
        }
    
    @staticmethod
    def handle_multiple_people(body_masks: list) -> dict:
        """
        Handle multiple people in frame.
        """
        if len(body_masks) == 0:
            return {'error': 'No people detected'}
        
        if len(body_masks) == 1:
            return {'mask': body_masks[0], 'multiple_people': False}
        
        # Use largest body
        largest_idx = max(
            range(len(body_masks)),
            key=lambda i: np.sum(body_masks[i])
        )
        
        return {
            'mask': body_masks[largest_idx],
            'multiple_people': True,
            'people_count': len(body_masks),
            'warning': 'Multiple people detected. Analyzing largest subject.'
        }
```

### 9.3 Calibration for Different Scenarios

```python
SCENARIO_CONFIGS = {
    'standing_full_body': {
        'zone_distances': {'proximal': 0.08, 'distal': 0.15, 'extended': 0.25},
        'min_body_area_ratio': 0.15,
        'expected_aspect_ratio': (0.3, 0.5)  # width/height
    },
    'seated_upper_body': {
        'zone_distances': {'proximal': 0.10, 'distal': 0.18, 'extended': 0.30},
        'min_body_area_ratio': 0.20,
        'expected_aspect_ratio': (0.5, 0.8)
    },
    'face_closeup': {
        'zone_distances': {'proximal': 0.15, 'distal': 0.30, 'extended': 0.50},
        'min_body_area_ratio': 0.30,
        'expected_aspect_ratio': (0.7, 1.0)
    },
    'meditation_pose': {
        'zone_distances': {'proximal': 0.06, 'distal': 0.12, 'extended': 0.20},
        'min_body_area_ratio': 0.25,
        'expected_aspect_ratio': (0.6, 0.9)
    }
}
```

---

*End of Segmentation Specification Document*
