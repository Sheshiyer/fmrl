import { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

const VERTEX_SRC = `#version 300 es
in vec2 a_position;
void main(){gl_Position=vec4(a_position,0,1);}`;

const FRAGMENT_SRC = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 hsv(float h,float s,float v){
  vec3 c=clamp(abs(mod(h*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.);
  return v*mix(vec3(1),c,s);
}

mat2 rotate2D(float a){
  float c=cos(a),s=sin(a);
  return mat2(c,-s,s,c);
}

void main(){
  vec2 FC=gl_FragCoord.xy;
  vec2 r=u_resolution;
  float t=u_time;

  float i=0.,e=0.,R=0.,s;
  vec3 q=vec3(0,0,0),p=vec3(0),d=vec3((FC.xy-.5*r)/r,.4);
  vec3 col=vec3(0);
  q.z-=1.;

  for(;i++<149.;){
    col+=hsv(.1,e*p.y*.6,e/3e1);
    p=q+=d*max(e,.01)*R*.2;
    p.xy*=rotate2D(.8);
    R=length(p);
    e=-p.z*1.6/R-1.;
    p=vec3(log2(R),e,atan(p.x*.1,p.y)-t*.3+5.);
    for(s=1.;s<1e3;s+=s)
      e+=abs(dot(sin(p.yzx*s),cos(p*s)))/s;
  }

  fragColor=vec4(col,1);
}`;

interface ShaderSplashProps {
  /** Minimum display time in ms before onDone can fire (default 2500) */
  minDuration?: number;
  /** Called when splash is ready to dismiss (click/tap or after duration) */
  onDone: () => void;
}

export function ShaderSplash({ minDuration = 2500, onDone }: ShaderSplashProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);
  const [canDismiss, setCanDismiss] = useState(false);
  const [fading, setFading] = useState(false);

  const dismiss = useCallback(() => {
    if (!canDismiss) return;
    setFading(true);
    setTimeout(onDone, 600);
  }, [canDismiss, onDone]);

  useEffect(() => {
    const timer = setTimeout(() => setCanDismiss(true), minDuration);
    return () => clearTimeout(timer);
  }, [minDuration]);

  // Auto-dismiss after min duration + 1.5s idle
  useEffect(() => {
    if (!canDismiss) return;
    const autoDismiss = setTimeout(() => {
      setFading(true);
      setTimeout(onDone, 600);
    }, 1500);
    return () => clearTimeout(autoDismiss);
  }, [canDismiss, onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) {
      // WebGL2 not available — skip splash
      onDone();
      return;
    }

    // Compile shader
    function compile(type: number, src: string): WebGLShader | null {
      const s = gl!.createShader(type);
      if (!s) return null;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        console.warn('[ShaderSplash] compile:', gl!.getShaderInfoLog(s));
        gl!.deleteShader(s);
        return null;
      }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    if (!vs || !fs) { onDone(); return; }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[ShaderSplash] link:', gl.getProgramInfoLog(prog));
      onDone();
      return;
    }

    gl.useProgram(prog);

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uTime = gl.getUniformLocation(prog, 'u_time');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    startRef.current = performance.now();

    const render = () => {
      const t = (performance.now() - startRef.current) / 1000;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, [onDone]);

  return createPortal(
    <div
      className={`cursor-pointer transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        overflow: 'hidden',
      }}
      onClick={dismiss}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') dismiss(); }}
      aria-label="Loading — click to continue"
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Title overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <h1
          className={`text-5xl sm:text-7xl font-bold tracking-[0.2em] uppercase transition-opacity duration-1000 ${canDismiss ? 'opacity-90' : 'opacity-0'}`}
          style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 0 40px rgba(212,175,55,0.4)' }}
        >
          FMRL
        </h1>
        <p
          className={`mt-4 text-xs tracking-[0.35em] uppercase transition-opacity duration-1000 delay-300 ${canDismiss ? 'opacity-60' : 'opacity-0'}`}
          style={{ color: 'rgba(255,255,255,0.6)' }}
        >
          {canDismiss ? 'click anywhere to continue' : 'initializing…'}
        </p>
      </div>
    </div>,
    document.body,
  );
}
