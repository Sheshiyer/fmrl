/**
 * PIP Renderer - WebGL2 shader for Polycontrast Interference Photography effect
 */
import type { PIPSettings } from '../types';
import { DEFAULT_PIP_SETTINGS } from '../types';

// Vertex shader source
const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUV;
void main(){
  vUV = aPosition * 0.5 + 0.5;
  vUV.y = 1.0 - vUV.y;
  gl_Position = vec4(aPosition, 0., 1.);
}`;

// Fragment shader source
const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uVideo;
uniform float uTime;
uniform float uSeed;
uniform float uPeriod;
uniform int uHarmonics;
uniform float uSpread;
uniform float uGain;
uniform float uRoughness;
uniform float uExponent;
uniform float uAmplitude;
uniform float uOffset;
uniform int uMonochrome;
uniform float uIntensity;

// 3D Simplex noise functions
vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0,0.5,1.0,2.0);
  vec3 i = floor(v + dot(v,C.yyy));
  vec3 x0= v - i + dot(i,C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1= min(g.xyz,l.zxy), i2= max(g.xyz,l.zxy);
  vec3 x1= x0 - i1 + C.xxx;
  vec3 x2= x0 - i2 + C.yyy;
  vec3 x3= x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
    i.z + vec4(0.0,i1.z,i2.z,1.0))
    + i.y + vec4(0.0,i1.y,i2.y,1.0))
    + i.x + vec4(0.0,i1.x,i2.x,1.0));
  vec4 j = p - 49.0*floor(p*(1.0/49.0));
  vec4 x_ = floor(j*(1.0/7.0));
  vec4 y_ = floor(j - 7.0*x_);
  vec4 x = x_*(1.0/7.0) + (1.0/14.0);
  vec4 y = y_*(1.0/7.0) + (1.0/14.0);
  vec4 h = 1.0 - abs(x)-abs(y);
  vec4 b0 = vec4(x.xy,y.xy), b1 = vec4(x.zw,y.zw);
  vec4 s0 = floor(b0)*2.0+1.0, s1 = floor(b1)*2.0+1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x), p1=vec3(a0.zw,h.y),
       p2=vec3(a1.xy,h.z), p3=vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(
    dot(p0,p0), dot(p1,p1),
    dot(p2,p2), dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m = max(0.6 - vec4(
    dot(x0,x0), dot(x1,x1),
    dot(x2,x2), dot(x3,x3)), 0.0);
  m = m*m;
  return 42.0 * dot(m*m, vec4(
    dot(p0,x0), dot(p1,x1),
    dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p){
  p += vec3(uSeed * 0.001);
  float f = 0.0;
  float amp = 1.0;
  float maxValue = 0.0;
  for(int i = 0; i < 8; i++){
    if(i >= uHarmonics) break;
    float n = snoise(p);
    float roughAmp = amp * (1.0 - uRoughness * float(i) / 8.0);
    f += roughAmp * n;
    maxValue += roughAmp;
    p *= uSpread;
    amp *= uGain;
  }
  if(maxValue > 0.0) f /= maxValue;
  f = sign(f) * pow(abs(f), uExponent);
  return f;
}

vec3 rgb2hsl(vec3 c){
  float M = max(c.r,max(c.g,c.b)),
        m = min(c.r,min(c.g,c.b)),
        d = M - m,
        l = (M+m)*0.5,
        s = d==0.0?0.0:d/(1.0-abs(2.0*l-1.0));
  float h=0.0;
  if(d>0.0){
    if(M==c.r) h = mod((c.g-c.b)/d + (c.g<c.b?6.0:0.0),6.0);
    else if(M==c.g) h = (c.b-c.r)/d +2.0;
    else h = (c.r-c.g)/d +4.0;
    h/=6.0;
  }
  return vec3(h,s,l);
}

float hue2rgb(float p, float q, float t){
  if(t<0.0) t+=1.0;
  if(t>1.0) t-=1.0;
  if(t<1.0/6.0) return p+(q-p)*6.0*t;
  if(t<1.0/2.0) return q;
  if(t<2.0/3.0) return p+(q-p)*(2.0/3.0-t)*6.0;
  return p;
}

vec3 hsl2rgb(vec3 c){
  float h=c.x, s=c.y, l=c.z;
  if(s==0.0) return vec3(l);
  float q = l<0.5?l*(1.0+s):l+s-l*s,
        p = 2.0*l - q;
  return vec3(
    hue2rgb(p,q,h+1.0/3.0),
    hue2rgb(p,q,h),
    hue2rgb(p,q,h-1.0/3.0)
  );
}

void main(){
  vec3 videoCol = texture(uVideo, vUV).rgb;
  float frequency = 1.0 / max(uPeriod, 0.001);
  float n = fbm(vec3(vUV * frequency, uTime));
  n = n * uAmplitude + uOffset;
  n = clamp(n, 0.0, 1.0);
  
  vec3 final;
  
  if(uMonochrome == 1) {
    float noiseMultiplier = 1.0 + (n - 0.5) * uIntensity * 2.0;
    final = videoCol * noiseMultiplier;
  } else {
    vec2 uvFreq = vUV * frequency;
    float rNoise = fbm(vec3(uvFreq + vec2(100.0), uTime));
    float gNoise = fbm(vec3(uvFreq + vec2(200.0), uTime));
    float bNoise = fbm(vec3(uvFreq + vec2(300.0), uTime));
    rNoise = clamp(rNoise * uAmplitude + uOffset, 0.0, 1.0);
    gNoise = clamp(gNoise * uAmplitude + uOffset, 0.0, 1.0);
    bNoise = clamp(bNoise * uAmplitude + uOffset, 0.0, 1.0);
    vec3 noiseColor = vec3(rNoise, gNoise, bNoise);
    vec3 videoHSL = rgb2hsl(videoCol);
    vec3 noiseHSL = rgb2hsl(noiseColor);
    vec3 blendedHSL = vec3(noiseHSL.x, noiseHSL.y, videoHSL.z);
    vec3 blendedRGB = hsl2rgb(blendedHSL);
    final = mix(videoCol, blendedRGB, uIntensity);
  }
  
  fragColor = vec4(final, 1.0);
}`;

export class PIPRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private videoTexture: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private settings: PIPSettings;
  private startTime: number = 0;
  private animationId: number | null = null;
  private video: HTMLVideoElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 required');
    this.gl = gl;
    this.settings = { ...DEFAULT_PIP_SETTINGS };
  }

  async init(): Promise<void> {
    const { gl } = this;

    // Create shader program
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    gl.useProgram(this.program);

    // Set up full-screen triangle
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    
    const aPos = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Create video texture
    this.videoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Get uniform locations
    this.uniforms = {
      uVideo: gl.getUniformLocation(this.program, 'uVideo'),
      uTime: gl.getUniformLocation(this.program, 'uTime'),
      uSeed: gl.getUniformLocation(this.program, 'uSeed'),
      uPeriod: gl.getUniformLocation(this.program, 'uPeriod'),
      uHarmonics: gl.getUniformLocation(this.program, 'uHarmonics'),
      uSpread: gl.getUniformLocation(this.program, 'uSpread'),
      uGain: gl.getUniformLocation(this.program, 'uGain'),
      uRoughness: gl.getUniformLocation(this.program, 'uRoughness'),
      uExponent: gl.getUniformLocation(this.program, 'uExponent'),
      uAmplitude: gl.getUniformLocation(this.program, 'uAmplitude'),
      uOffset: gl.getUniformLocation(this.program, 'uOffset'),
      uMonochrome: gl.getUniformLocation(this.program, 'uMonochrome'),
      uIntensity: gl.getUniformLocation(this.program, 'uIntensity'),
    };

    gl.uniform1i(this.uniforms.uVideo, 0);
    this.startTime = performance.now();
  }

  setVideoSource(video: HTMLVideoElement): void {
    this.video = video;
  }

  start(): void {
    if (this.animationId) return;
    this.render();
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  pause(): void {
    this.stop();
  }

  resume(): void {
    this.start();
  }

  setParameter<K extends keyof PIPSettings>(name: K, value: PIPSettings[K]): void {
    this.settings[name] = value;
  }

  getParameters(): PIPSettings {
    return { ...this.settings };
  }

  loadPreset(preset: Partial<PIPSettings>): void {
    this.settings = { ...this.settings, ...preset };
  }

  captureFrame(): ImageData {
    const { canvas } = this;
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) throw new Error('Cannot create 2D context');
    
    ctx.canvas.width = canvas.width;
    ctx.canvas.height = canvas.height;
    ctx.drawImage(canvas, 0, 0);
    
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  captureFrameAsDataURL(type = 'image/png', quality = 0.95): string {
    return this.canvas.toDataURL(type, quality);
  }

  private render = (): void => {
    const { gl, video, settings } = this;

    // Resize canvas if needed
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      gl.viewport(0, 0, w, h);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);

    // Upload video frame
    if (video && video.readyState >= video.HAVE_CURRENT_DATA) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    }

    // Update uniforms
    const t = (performance.now() - this.startTime) * 0.001 * settings.speed;
    gl.uniform1f(this.uniforms.uTime, t);
    gl.uniform1f(this.uniforms.uSeed, settings.seed);
    gl.uniform1f(this.uniforms.uPeriod, settings.period);
    gl.uniform1i(this.uniforms.uHarmonics, settings.harmonics);
    gl.uniform1f(this.uniforms.uSpread, settings.spread);
    gl.uniform1f(this.uniforms.uGain, settings.gain);
    gl.uniform1f(this.uniforms.uRoughness, settings.roughness);
    gl.uniform1f(this.uniforms.uExponent, settings.exponent);
    gl.uniform1f(this.uniforms.uAmplitude, settings.amplitude);
    gl.uniform1f(this.uniforms.uOffset, settings.offset);
    gl.uniform1i(this.uniforms.uMonochrome, settings.monochrome ? 1 : 0);
    gl.uniform1f(this.uniforms.uIntensity, settings.intensity);

    // Draw
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.animationId = requestAnimationFrame(this.render);
  };

  private createShader(type: number, source: string): WebGLShader {
    const { gl } = this;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${error}`);
    }
    
    return shader;
  }

  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const { gl } = this;
    const vertShader = this.createShader(gl.VERTEX_SHADER, vertSrc);
    const fragShader = this.createShader(gl.FRAGMENT_SHADER, fragSrc);
    
    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create program');
    
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      throw new Error(`Program link error: ${error}`);
    }
    
    return program;
  }

  destroy(): void {
    this.stop();
    const { gl } = this;
    
    if (this.program) gl.deleteProgram(this.program);
    if (this.videoTexture) gl.deleteTexture(this.videoTexture);
    if (this.vao) gl.deleteVertexArray(this.vao);
  }
}
