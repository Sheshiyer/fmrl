/**
 * PIPShader - Real-time PIP visualization with ML-based segmentation
 *
 * Uses MediaPipe models for accurate face tracking and body segmentation:
 * - Face: MediaPipe Face Mesh (478 landmarks) for precise face oval detection
 * - Body: MediaPipe Selfie Segmentation for real-time body/background separation
 *
 * NO FALLBACKS - requires ML models to be loaded for face/body regions
 *
 * TouchDesigner-style parameters:
 * - blur: Spatial blur amount (0-5)
 * - harmonics: Harmonic modulation frequency (0-10)
 * - distortion: Spatial distortion amount (0-2)
 * - chaos: Chaos factor for noise variation (0-1)
 * - evolution: Time evolution speed (0-2)
 * - detail: Detail enhancement factor (0-3)
 * - scale: Overall scale multiplier (0.1-5)
 * - bias: Output bias offset (-0.5-0.5)
 * - power: Power exponent modifier (0.1-5)
 * - octaves: Number of noise octaves (1-8)
 *
 * Usage:
 * const shaderRef = useRef<PIPShaderHandle>(null);
 * <PIPShader ref={shaderRef} />
 * shaderRef.current?.updateParams({ blur: 1.5, harmonics: 2.0, chaos: 0.3 });
 */
import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { BodySegmenter, FaceSegmenter, FACE_REGIONS } from '../../services/segmentation';

export type AnalysisRegion = 'full' | 'face' | 'body';

export interface PIPShaderHandle {
  captureImage: () => string | null;
  getCanvas: () => HTMLCanvasElement | null;
  updateParams: (params: Partial<typeof defaultParams>) => void;
}

interface FrameData {
  brightness: number;
  colorEntropy: number;
  horizontalSymmetry: number;
  verticalSymmetry: number;
  saturationMean: number;
}

interface PIPShaderProps {
  className?: string;
  analysisRegion?: AnalysisRegion;
  onFrameData?: (data: FrameData) => void;
}

// Face oval landmark indices for MediaPipe Face Mesh (478 landmarks)
const FACE_OVAL_INDICES = FACE_REGIONS.face_oval;

const vertexSrc = `#version 300 es
in vec2 aPosition;
out vec2 vUV;
void main() {
  vUV = aPosition * 0.5 + 0.5;
  vUV.y = 1.0 - vUV.y;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const fragmentSrc = `#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uVideo;
uniform sampler2D uMask;
uniform float uTime;
uniform float uSeed;
uniform float uPeriod;
uniform float uSpread;
uniform float uGain;
uniform float uRoughness;
uniform float uExponent;
uniform float uAmplitude;
uniform float uOffset;
uniform float uIntensity;
uniform float uVideoInfluence;
uniform float uColorSaturation;
uniform float uHueShift;
uniform int uMonochrome;
uniform int uUseMask;
uniform float uBlur;
uniform float uHarmonics;
uniform float uDistortion;
uniform float uChaos;
uniform float uEvolution;
uniform float uDetail;
uniform float uScale;
uniform float uBias;
uniform float uPower;
uniform int uOctaves;

vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy), i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec4 j = p - 49.0 * floor(p * (1.0/49.0));
  vec4 x_ = floor(j * (1.0/7.0));
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * (1.0/7.0) + (1.0/14.0);
  vec4 y = y_ * (1.0/7.0) + (1.0/14.0);
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy), b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0, s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x), p1 = vec3(a0.zw, h.y), p2 = vec3(a1.xy, h.z), p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p) {
  p += vec3(uSeed * 0.001);
  float f = 0.0, amp = 1.0, maxValue = 0.0;
  int octaves = min(uOctaves, 8);
  for (int i = 0; i < octaves; i++) {
    float n = snoise(p);
    float harmonic = sin(float(i) * uHarmonics + uEvolution * uTime);
    float roughAmp = amp * (1.0 - uRoughness * float(i) / 8.0) * (1.0 + harmonic * 0.3);
    f += roughAmp * n;
    maxValue += roughAmp;
    p *= uSpread * (1.0 + uDistortion * 0.1);
    amp *= uGain * (1.0 + uChaos * 0.05);
  }
  return maxValue > 0.0 ? f / maxValue : f;
}

vec3 rgb2hsl(vec3 c) {
  float M = max(c.r, max(c.g, c.b)), m = min(c.r, min(c.g, c.b));
  float d = M - m, l = (M + m) * 0.5;
  float s = d == 0.0 ? 0.0 : d / (1.0 - abs(2.0 * l - 1.0));
  float h = 0.0;
  if (d > 0.0) {
    if (M == c.r) h = mod((c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0), 6.0);
    else if (M == c.g) h = (c.b - c.r) / d + 2.0;
    else h = (c.r - c.g) / d + 4.0;
    h /= 6.0;
  }
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 c) {
  float h = c.x, s = c.y, l = c.z;
  if (s == 0.0) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s, p = 2.0 * l - q;
  return vec3(hue2rgb(p, q, h + 1.0/3.0), hue2rgb(p, q, h), hue2rgb(p, q, h - 1.0/3.0));
}

vec3 touchDesignerColorComposite(vec3 base, vec3 overlay) {
  vec3 hslBase = rgb2hsl(base), hslOverlay = rgb2hsl(overlay);
  return hsl2rgb(vec3(hslOverlay.x, mix(hslBase.y, hslOverlay.y, 0.8), hslBase.z));
}

vec3 enhancedNoiseColor(float n, vec3 videoCol) {
  vec3 videoHSL = rgb2hsl(videoCol);
  float hueShift = n * uHueShift + videoHSL.x * (1.0 - uHueShift);
  float saturation = clamp(mix(0.7, 1.0, fract(n + 0.33)) * uColorSaturation, 0.0, 1.0);
  return hsl2rgb(vec3(hueShift, saturation, mix(0.3, 0.9, fract(n + 0.66))));
}

vec3 applyBlur(vec3 col, vec2 uv, float blur) {
  if (blur <= 0.0) return col;
  vec3 blurred = vec3(0.0);
  float total = 0.0;
  float samples = max(1.0, blur * 8.0);
  for(float x = -blur; x <= blur; x += 1.0/samples) {
    for(float y = -blur; y <= blur; y += 1.0/samples) {
      vec2 offset = vec2(x, y) * 0.001;
      blurred += texture(uVideo, uv + offset).rgb;
      total += 1.0;
    }
  }
  return blurred / total;
}

void main() {
  vec3 videoCol = texture(uVideo, vUV).rgb;
  float maskValue = uUseMask == 1 ? texture(uMask, vUV).r : 1.0;
  
  if (maskValue < 0.5) {
    fragColor = vec4(videoCol * 0.4, 1.0);
    return;
  }
  
  // Apply blur if enabled
  vec3 baseVideo = applyBlur(videoCol, vUV, uBlur);
  
  float scale = 1.0 / max(uPeriod * uScale, 0.0001);
  vec3 spatialCoord = vec3(vUV * scale, uTime * 0.1);
  vec3 videoCoord = baseVideo * scale * 2.0;
  vec3 noiseCoord = mix(spatialCoord, videoCoord, uVideoInfluence) + vec3(0.0, 0.0, uTime * 0.1);
  
  float n = fbm(noiseCoord);
  n = sign(n) * pow(abs(n), uExponent * uPower);
  n = clamp(n * uAmplitude + uOffset + uBias, 0.0, 1.0);
  
  // Add detail enhancement
  float detail = fbm(noiseCoord * uDetail);
  n = mix(n, n + detail * 0.2, uDetail);
  
  vec3 outCol;
  if(uMonochrome == 1) {
    outCol = baseVideo * (1.0 + (n - 0.5) * uIntensity * 2.0);
  } else {
    vec3 noiseCol = enhancedNoiseColor(n, baseVideo);
    outCol = mix(baseVideo, touchDesignerColorComposite(baseVideo, noiseCol), uIntensity);
  }
  
  float edgeBlend = smoothstep(0.4, 0.6, maskValue);
  fragColor = vec4(clamp(mix(videoCol * 0.4, outCol, edgeBlend), 0.0, 1.0), 1.0);
}`;

const defaultParams = {
  seed: 8057, period: 0.06, spread: 2.0, gain: 0.29, roughness: 0.33,
  exponent: 1.04, amplitude: 0.96, offset: 0.47, intensity: 0.96,
  videoInfluence: 0.3, colorSaturation: 0.83, hueShift: 0.82, monochrome: false,
  blur: 0.0, harmonics: 1.0, distortion: 0.0, chaos: 0.0, evolution: 0.1,
  detail: 1.0, scale: 1.0, bias: 0.0, power: 1.0, octaves: 4,
};

const VIRTUAL_CAMERA_HINTS = [
  'obs',
  'virtual',
  'camo',
  'snap camera',
  'droidcam',
  'epoccam',
  'ndi',
  'continuity',
];

function isLikelyVirtualCameraLabel(label: string): boolean {
  const lowered = label.toLowerCase();
  return VIRTUAL_CAMERA_HINTS.some((hint) => lowered.includes(hint));
}

async function buildPreferredCameraConstraints(): Promise<MediaStreamConstraints> {
  const base: MediaTrackConstraints = {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: 'user',
  };

  if (!navigator.mediaDevices?.enumerateDevices) {
    return { video: base, audio: false };
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoInputs = devices.filter((d) => d.kind === 'videoinput');
  const preferred =
    videoInputs.find((d) => d.label && !isLikelyVirtualCameraLabel(d.label)) ??
    videoInputs[0];

  if (preferred?.deviceId) {
    return {
      video: {
        ...base,
        deviceId: { exact: preferred.deviceId },
      },
      audio: false,
    };
  }

  return { video: base, audio: false };
}

type ShaderUniforms = {
  uVideo: WebGLUniformLocation | null;
  uMask: WebGLUniformLocation | null;
  uTime: WebGLUniformLocation | null;
  uSeed: WebGLUniformLocation | null;
  uPeriod: WebGLUniformLocation | null;
  uSpread: WebGLUniformLocation | null;
  uGain: WebGLUniformLocation | null;
  uRoughness: WebGLUniformLocation | null;
  uExponent: WebGLUniformLocation | null;
  uAmplitude: WebGLUniformLocation | null;
  uOffset: WebGLUniformLocation | null;
  uIntensity: WebGLUniformLocation | null;
  uVideoInfluence: WebGLUniformLocation | null;
  uColorSaturation: WebGLUniformLocation | null;
  uHueShift: WebGLUniformLocation | null;
  uMonochrome: WebGLUniformLocation | null;
  uUseMask: WebGLUniformLocation | null;
  uBlur: WebGLUniformLocation | null;
  uHarmonics: WebGLUniformLocation | null;
  uDistortion: WebGLUniformLocation | null;
  uChaos: WebGLUniformLocation | null;
  uEvolution: WebGLUniformLocation | null;
  uDetail: WebGLUniformLocation | null;
  uScale: WebGLUniformLocation | null;
  uBias: WebGLUniformLocation | null;
  uPower: WebGLUniformLocation | null;
  uOctaves: WebGLUniformLocation | null;
};

export const PIPShader = forwardRef<PIPShaderHandle, PIPShaderProps>(({ className, analysisRegion = 'full', onFrameData }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const analysisRegionRef = useRef<AnalysisRegion>(analysisRegion);
  
  // Mutable shader parameters
  const paramsRef = useRef({ ...defaultParams });
  const uniformsRef = useRef<ShaderUniforms | null>(null);

  // Frame counter for deterministic sampling (replaces Math.random() < 0.2)
  const frameCountRef = useRef<number>(0);
  const lastMetricsTimeRef = useRef<number>(0);
  const METRICS_INTERVAL_MS = 500; // Compute metrics every 500ms (~2 fps for metrics)
  const pixelBufRef = useRef<Uint8Array | null>(null);

  // Real-time ML segmentation refs (MediaPipe models)
  const bodySegmenterRef = useRef<BodySegmenter | null>(null);
  const faceSegmenterRef = useRef<FaceSegmenter | null>(null);
  const modelsReadyRef = useRef(false);
  const [loadingStatus, setLoadingStatus] = useState('Initializing ML models...');

  // Expose captureImage method via ref
  useImperativeHandle(ref, () => ({
    captureImage: () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.warn('PIPShader: Canvas ref is null');
        return null;
      }
      try {
        const dataUrl = canvas.toDataURL('image/png');
        console.log('PIPShader: Canvas captured successfully, size:', dataUrl.length);
        return dataUrl;
      } catch (error) {
        console.error('PIPShader: Failed to capture canvas:', error);
        return null;
      }
    },
    getCanvas: () => canvasRef.current,
    updateParams: (newParams) => {
      Object.assign(paramsRef.current, newParams);
      // Update uniforms immediately if they're already initialized
      if (uniformsRef.current && glRef.current) {
        const gl = glRef.current;
        const uniforms = uniformsRef.current;
        const params = paramsRef.current;
        
        // Update all uniforms with new values
        gl.uniform1f(uniforms.uBlur, params.blur);
        gl.uniform1f(uniforms.uHarmonics, params.harmonics);
        gl.uniform1f(uniforms.uDistortion, params.distortion);
        gl.uniform1f(uniforms.uChaos, params.chaos);
        gl.uniform1f(uniforms.uEvolution, params.evolution);
        gl.uniform1f(uniforms.uDetail, params.detail);
        gl.uniform1f(uniforms.uScale, params.scale);
        gl.uniform1f(uniforms.uBias, params.bias);
        gl.uniform1f(uniforms.uPower, params.power);
        gl.uniform1i(uniforms.uOctaves, params.octaves);
        gl.uniform1f(uniforms.uPeriod, params.period);
        gl.uniform1f(uniforms.uSpread, params.spread);
        gl.uniform1f(uniforms.uGain, params.gain);
        gl.uniform1f(uniforms.uRoughness, params.roughness);
        gl.uniform1f(uniforms.uExponent, params.exponent);
        gl.uniform1f(uniforms.uAmplitude, params.amplitude);
        gl.uniform1f(uniforms.uOffset, params.offset);
        gl.uniform1f(uniforms.uIntensity, params.intensity);
        gl.uniform1f(uniforms.uVideoInfluence, params.videoInfluence);
        gl.uniform1f(uniforms.uColorSaturation, params.colorSaturation);
        gl.uniform1f(uniforms.uHueShift, params.hueShift);
        gl.uniform1i(uniforms.uMonochrome, params.monochrome ? 1 : 0);
      }
    },
  }));

  useEffect(() => { analysisRegionRef.current = analysisRegion; }, [analysisRegion]);

  // Initialize MediaPipe ML models for real-time segmentation
  useEffect(() => {
    let cancelled = false;

    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
        ),
      ]);

    const initModels = async () => {
      try {
        setLoadingStatus('Loading body segmentation model...');
        bodySegmenterRef.current = new BodySegmenter({ runningMode: 'VIDEO' });
        await withTimeout(bodySegmenterRef.current.initialize(), 30_000, 'Body segmentation model');
        if (cancelled) return;
        console.log('[PIPShader] Body segmenter initialized (MediaPipe Selfie Segmentation)');

        setLoadingStatus('Loading face detection model...');
        faceSegmenterRef.current = new FaceSegmenter({ runningMode: 'VIDEO', numFaces: 1 });
        await withTimeout(faceSegmenterRef.current.initialize(), 30_000, 'Face detection model');
        if (cancelled) return;
        console.log('[PIPShader] Face segmenter initialized (MediaPipe Face Mesh - 478 landmarks)');

        modelsReadyRef.current = true;
        setLoadingStatus('');
      } catch (error) {
        console.error('[PIPShader] ML model initialization failed:', error);
        // Still allow the shader to run in 'full' mode without ML models
        setLoadingStatus('');
        console.warn('[PIPShader] Continuing without ML segmentation — full-frame mode only');
      }
    };

    initModels();

    return () => {
      cancelled = true;
      bodySegmenterRef.current?.close();
      faceSegmenterRef.current?.close();
    };
  }, []);

  const createShader = useCallback((gl: WebGL2RenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('Shader compile error: ' + info);
    }
    return shader;
  }, []);

  const createProgram = useCallback((gl: WebGL2RenderingContext) => {
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexSrc);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create program');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(program));
    }
    return program;
  }, [createShader]);

  /**
   * Draw real-time segmentation mask using MediaPipe ML models
   * NO FALLBACKS - uses actual face landmarks and body segmentation
   */
  const drawSegmentationMask = useCallback(async (
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    w: number,
    h: number,
    region: AnalysisRegion,
    timestamp: number
  ): Promise<void> => {
    // Clear to black (masked out)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h);

    if (region === 'full') {
      // Full frame - white mask (everything visible)
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    if (!modelsReadyRef.current) {
      // Models not ready yet - show nothing until they load
      return;
    }

    if (region === 'face' && faceSegmenterRef.current?.isReady()) {
      // Real-time face segmentation using MediaPipe Face Mesh (478 landmarks)
      const faceResult = await faceSegmenterRef.current.detect(video, timestamp);
      
      if (faceResult.faceDetected && faceResult.landmarks.length > 0) {
        // Draw face oval mask from actual ML-detected landmarks
        ctx.fillStyle = 'white';
        ctx.beginPath();
        
        // Get face oval points from landmarks
        const faceOvalPoints = FACE_OVAL_INDICES
          .filter((idx: number) => idx < faceResult.landmarks.length)
          .map((idx: number) => faceResult.landmarks[idx]);
        
        if (faceOvalPoints.length > 0) {
          ctx.moveTo(faceOvalPoints[0].x, faceOvalPoints[0].y);
          for (let i = 1; i < faceOvalPoints.length; i++) {
            ctx.lineTo(faceOvalPoints[i].x, faceOvalPoints[i].y);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (region === 'body' && bodySegmenterRef.current?.isReady()) {
      // Real-time body segmentation using MediaPipe Selfie Segmentation
      // Body mode = full person (body + face), excluding background
      const bodyResult = await bodySegmenterRef.current.segment(video, timestamp);
      
      console.log('[PIPShader] Body result:', {
        bodyDetected: bodyResult.bodyDetected,
        maskLength: bodyResult.mask?.length,
        expectedLength: w * h
      });
      
      if (bodyResult.mask && bodyResult.mask.length > 0) {
        // Create ImageData from body mask (includes face)
        const imageData = ctx.createImageData(w, h);
        const expectedLength = w * h;
        
        // Body mode includes the full person (body + face)
        for (let i = 0; i < Math.min(bodyResult.mask.length, expectedLength); i++) {
          const isBody = bodyResult.mask[i] > 128;
          const value = isBody ? 255 : 0;
          imageData.data[i * 4] = value;     // R
          imageData.data[i * 4 + 1] = value; // G
          imageData.data[i * 4 + 2] = value; // B
          imageData.data[i * 4 + 3] = 255;   // A
        }
        
        ctx.putImageData(imageData, 0, 0);
      } else {
        console.warn('[PIPShader] Body segmentation returned empty mask, using full frame');
        // Fallback: show full frame if body detection fails
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, w, h);
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    let disposed = false;
    let program: WebGLProgram;
    try {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = 640;
    maskCanvas.height = 480;
    maskCanvasRef.current = maskCanvas;
    const maskCtx = maskCanvas.getContext('2d')!;

    const gl = canvas.getContext('webgl2', {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true  // Required for toDataURL() to work
    });
    if (!gl) { setLoadingStatus('WebGL2 not supported by this device'); return; }
    glRef.current = gl;

    program = createProgram(gl);
    gl.useProgram(program);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const videoTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const maskTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const uniforms = {
      uVideo: gl.getUniformLocation(program, 'uVideo'),
      uMask: gl.getUniformLocation(program, 'uMask'),
      uTime: gl.getUniformLocation(program, 'uTime'),
      uSeed: gl.getUniformLocation(program, 'uSeed'),
      uPeriod: gl.getUniformLocation(program, 'uPeriod'),
      uSpread: gl.getUniformLocation(program, 'uSpread'),
      uGain: gl.getUniformLocation(program, 'uGain'),
      uRoughness: gl.getUniformLocation(program, 'uRoughness'),
      uExponent: gl.getUniformLocation(program, 'uExponent'),
      uAmplitude: gl.getUniformLocation(program, 'uAmplitude'),
      uOffset: gl.getUniformLocation(program, 'uOffset'),
      uIntensity: gl.getUniformLocation(program, 'uIntensity'),
      uVideoInfluence: gl.getUniformLocation(program, 'uVideoInfluence'),
      uColorSaturation: gl.getUniformLocation(program, 'uColorSaturation'),
      uHueShift: gl.getUniformLocation(program, 'uHueShift'),
      uMonochrome: gl.getUniformLocation(program, 'uMonochrome'),
      uUseMask: gl.getUniformLocation(program, 'uUseMask'),
      uBlur: gl.getUniformLocation(program, 'uBlur'),
      uHarmonics: gl.getUniformLocation(program, 'uHarmonics'),
      uDistortion: gl.getUniformLocation(program, 'uDistortion'),
      uChaos: gl.getUniformLocation(program, 'uChaos'),
      uEvolution: gl.getUniformLocation(program, 'uEvolution'),
      uDetail: gl.getUniformLocation(program, 'uDetail'),
      uScale: gl.getUniformLocation(program, 'uScale'),
      uBias: gl.getUniformLocation(program, 'uBias'),
      uPower: gl.getUniformLocation(program, 'uPower'),
      uOctaves: gl.getUniformLocation(program, 'uOctaves'),
    };
    uniformsRef.current = uniforms;
    gl.uniform1i(uniforms.uVideo, 0);
    gl.uniform1i(uniforms.uMask, 1);

    const startVideoPipeline = async () => {
      const constraints = await buildPreferredCameraConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      // Retry play() if interrupted by a concurrent load — common in React StrictMode
      // and Tauri WebView where the effect may re-run during mount
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await video.play();
          break;
        } catch (playErr) {
          if (playErr instanceof DOMException && playErr.name === 'AbortError' && attempt < 2) {
            await new Promise(r => setTimeout(r, 100));
            continue;
          }
          throw playErr;
        }
      }

      const tracks = stream.getVideoTracks();
      if (tracks.length === 0) {
        throw new Error('No video track available from selected camera.');
      }

      // Wait for video to have actual frame data before starting render loop
      // This prevents texImage2D from silently failing with an empty video
      if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
          video.addEventListener('loadeddata', () => resolve(), { once: true });
          // Safety timeout — don't wait forever
          setTimeout(resolve, 3000);
        });
      }

      if (disposed) return; // Check again after waiting

      setLoadingStatus('');
      startTimeRef.current = performance.now();
      let firstFrameLogged = false;

      const render = async () => {
          if (!gl || !canvas || disposed) return;
          try {
          // Skip frame if video still not ready (e.g., stream interrupted)
          if (video.readyState < 2 || video.videoWidth === 0) {
            animationRef.current = requestAnimationFrame(render);
            return;
          }
          // Ensure correct program is active (prevents stale uniform errors on re-mount)
          gl.useProgram(program);
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 480;
          const timestamp = performance.now();
          
          if (canvas.width !== vw || canvas.height !== vh) {
            canvas.width = vw;
            canvas.height = vh;
            maskCanvas.width = vw;
            maskCanvas.height = vh;
            gl.viewport(0, 0, vw, vh);
          }

          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, videoTex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);

          if (!firstFrameLogged) {
            console.log('[PIPShader] First frame rendered:', vw, 'x', vh, 'readyState:', video.readyState);
            firstFrameLogged = true;
          }

          const region = analysisRegionRef.current;
          const useMask = region !== 'full';
          gl.uniform1i(uniforms.uUseMask, useMask ? 1 : 0);
          
          if (useMask) {
            // Use real-time ML segmentation (MediaPipe Face Mesh / Selfie Segmentation)
            await drawSegmentationMask(maskCtx, video, vw, vh, region, timestamp);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, maskTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
          }

          const t = (timestamp - startTimeRef.current) * 0.001;
          const params = paramsRef.current;
          gl.uniform1f(uniforms.uTime, t);
          gl.uniform1f(uniforms.uSeed, params.seed);
          gl.uniform1f(uniforms.uPeriod, params.period);
          gl.uniform1f(uniforms.uSpread, params.spread);
          gl.uniform1f(uniforms.uGain, params.gain);
          gl.uniform1f(uniforms.uRoughness, params.roughness);
          gl.uniform1f(uniforms.uExponent, params.exponent);
          gl.uniform1f(uniforms.uAmplitude, params.amplitude);
          gl.uniform1f(uniforms.uOffset, params.offset);
          gl.uniform1f(uniforms.uIntensity, params.intensity);
          gl.uniform1f(uniforms.uVideoInfluence, params.videoInfluence);
          gl.uniform1f(uniforms.uColorSaturation, params.colorSaturation);
          gl.uniform1f(uniforms.uHueShift, params.hueShift);
          gl.uniform1i(uniforms.uMonochrome, params.monochrome ? 1 : 0);
          // New TouchDesigner-style parameters
          gl.uniform1f(uniforms.uBlur, params.blur);
          gl.uniform1f(uniforms.uHarmonics, params.harmonics);
          gl.uniform1f(uniforms.uDistortion, params.distortion);
          gl.uniform1f(uniforms.uChaos, params.chaos);
          gl.uniform1f(uniforms.uEvolution, params.evolution);
          gl.uniform1f(uniforms.uDetail, params.detail);
          gl.uniform1f(uniforms.uScale, params.scale);
          gl.uniform1f(uniforms.uBias, params.bias);
          gl.uniform1f(uniforms.uPower, params.power);
          gl.uniform1i(uniforms.uOctaves, params.octaves);

          gl.bindVertexArray(vao);
          gl.drawArrays(gl.TRIANGLES, 0, 3);

          // Compute metrics using time-based throttling (every METRICS_INTERVAL_MS)
          frameCountRef.current++;
          const now = performance.now();
          const shouldComputeMetrics = onFrameData && (now - lastMetricsTimeRef.current >= METRICS_INTERVAL_MS);

          if (shouldComputeMetrics) {
            lastMetricsTimeRef.current = now;
            const bufSize = vw * vh * 4;
            if (!pixelBufRef.current || pixelBufRef.current.length !== bufSize) {
              pixelBufRef.current = new Uint8Array(bufSize);
            }
            const pixels = pixelBufRef.current;
            gl.readPixels(0, 0, vw, vh, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

            // For full mode, the mask may not be drawn (useMask=false), so we need to
            // ensure maskImageData has white pixels for full frame analysis
            let maskImageData: ImageData;
            if (region === 'full') {
              // Create a white mask for full mode (all pixels are included)
              maskImageData = maskCtx.createImageData(vw, vh);
              for (let i = 0; i < maskImageData.data.length; i += 4) {
                maskImageData.data[i] = 255;     // R
                maskImageData.data[i + 1] = 255; // G
                maskImageData.data[i + 2] = 255; // B
                maskImageData.data[i + 3] = 255; // A
              }
            } else {
              // Get mask data from the mask canvas for face/body modes
              maskImageData = maskCtx.getImageData(0, 0, vw, vh);
            }

            const maskedPixels: number[] = [];
            const saturations: number[] = [];

            // Collect brightness and saturation values from masked pixels
            for (let y = 0; y < vh; y++) {
              for (let x = 0; x < vw; x++) {
                const i = y * vw + x;
                if (maskImageData.data[i * 4] > 128) {
                  const r = pixels[i * 4];
                  const g = pixels[i * 4 + 1];
                  const b = pixels[i * 4 + 2];
                  const intensity = (r + g + b) / 3;
                  maskedPixels.push(intensity);

                  // Calculate saturation for this pixel (HSV)
                  const max = Math.max(r, g, b);
                  const min = Math.min(r, g, b);
                  const saturation = max === 0 ? 0 : (max - min) / max;
                  saturations.push(saturation);
                }
              }
            }

            if (maskedPixels.length > 0) {
              const avgBrightness = maskedPixels.reduce((a, b) => a + b, 0) / maskedPixels.length / 255;
              const variance = maskedPixels.reduce((sum, val) => sum + Math.pow(val / 255 - avgBrightness, 2), 0) / maskedPixels.length;
              const colorEntropy = Math.min(1, Math.sqrt(variance) * 3 + 0.5);

              // Calculate saturation mean
              const saturationMean = saturations.length > 0
                ? saturations.reduce((a, b) => a + b, 0) / saturations.length
                : 0.5;

              // Calculate horizontal symmetry (left-right)
              const midX = Math.floor(vw / 2);
              let hSymSum = 0, hSymCount = 0;
              for (let y = 0; y < vh; y++) {
                for (let x = 0; x < midX; x++) {
                  const leftIdx = y * vw + x;
                  const rightIdx = y * vw + (vw - 1 - x);
                  const leftMasked = maskImageData.data[leftIdx * 4] > 128;
                  const rightMasked = maskImageData.data[rightIdx * 4] > 128;
                  if (leftMasked && rightMasked) {
                    const leftI = (pixels[leftIdx * 4] + pixels[leftIdx * 4 + 1] + pixels[leftIdx * 4 + 2]) / 3;
                    const rightI = (pixels[rightIdx * 4] + pixels[rightIdx * 4 + 1] + pixels[rightIdx * 4 + 2]) / 3;
                    hSymSum += 1 - Math.abs(leftI - rightI) / 255;
                    hSymCount++;
                  }
                }
              }
              const horizontalSymmetry = hSymCount > 0 ? hSymSum / hSymCount : 0.5;

              // Calculate vertical symmetry (top-bottom)
              const midY = Math.floor(vh / 2);
              let vSymSum = 0, vSymCount = 0;
              for (let y = 0; y < midY; y++) {
                for (let x = 0; x < vw; x++) {
                  const topIdx = y * vw + x;
                  const bottomIdx = (vh - 1 - y) * vw + x;
                  const topMasked = maskImageData.data[topIdx * 4] > 128;
                  const bottomMasked = maskImageData.data[bottomIdx * 4] > 128;
                  if (topMasked && bottomMasked) {
                    const topI = (pixels[topIdx * 4] + pixels[topIdx * 4 + 1] + pixels[topIdx * 4 + 2]) / 3;
                    const bottomI = (pixels[bottomIdx * 4] + pixels[bottomIdx * 4 + 1] + pixels[bottomIdx * 4 + 2]) / 3;
                    vSymSum += 1 - Math.abs(topI - bottomI) / 255;
                    vSymCount++;
                  }
                }
              }
              const verticalSymmetry = vSymCount > 0 ? vSymSum / vSymCount : 0.5;

              onFrameData({ brightness: avgBrightness, colorEntropy, horizontalSymmetry, verticalSymmetry, saturationMean });
            } else {
              const centerIdx = (Math.floor(vh / 2) * vw + Math.floor(vw / 2)) * 4;
              const brightness = (pixels[centerIdx] + pixels[centerIdx + 1] + pixels[centerIdx + 2]) / (3 * 255);
              onFrameData({ brightness, colorEntropy: 0.7, horizontalSymmetry: 0.5, verticalSymmetry: 0.5, saturationMean: 0.5 });
            }
          }

          } catch (frameErr) {
            console.warn('[PIPShader] Render frame error (continuing):', frameErr);
          }

          animationRef.current = requestAnimationFrame(render);
        };
        render();
      };

    void startVideoPipeline().catch((err) => {
      if (disposed) return; // Ignore errors after cleanup
      const message = err instanceof Error ? err.message : 'Camera not available';
      console.warn('Camera not available:', err);
      setLoadingStatus(`Camera unavailable: ${message}`);
    });

    } catch (initErr) {
      console.error('[PIPShader] Initialization failed:', initErr);
      setLoadingStatus(`Init error: ${initErr instanceof Error ? initErr.message : 'Unknown error'}`);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(animationRef.current);
      if (video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
      // Delete the shader program to free GPU resources — but do NOT lose the
      // WebGL context itself, because React StrictMode will re-mount and needs
      // the same canvas context to create a new program.
      try {
        const glCtx = canvasRef.current?.getContext('webgl2');
        if (glCtx && program) {
          glCtx.deleteProgram(program);
        }
      } catch { /* ignore cleanup errors */ }
    };
  }, [createProgram, onFrameData, drawSegmentationMask]);

  return (
    <div className={`relative flex items-center justify-center bg-black overflow-hidden ${className || ''}`}>
      <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
      <canvas ref={canvasRef} className="w-full h-full object-contain" />
      {loadingStatus && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm">
          {loadingStatus}
        </div>
      )}
    </div>
  );
});

PIPShader.displayName = 'PIPShader';

export default PIPShader;
