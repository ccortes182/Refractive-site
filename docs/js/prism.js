/* ==========================================================================
   Prism Background — WebGL refraction shader (ported from ReactBits)
   Zero dependencies — raw WebGL, no OGL needed
   ========================================================================== */

function initPrism() {
  const container = document.getElementById('prism-bg');
  if (!container) return;

  // ── Config ──
  const HEIGHT = 3.5;
  const BASE_HALF = 5.5 * 0.5;
  const GLOW = 1.0;
  const NOISE = 0.5;
  const SCALE = 3.6;
  const HUE_SHIFT = 0.0;
  const COLOR_FREQ = 1.0;
  const BLOOM = 1.0;
  const TIME_SCALE = 0.5;
  const SAT = 1.5; // transparent mode

  // ── Canvas & Context ──
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block'
  });
  container.appendChild(canvas);

  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) { console.warn('Prism: WebGL not supported'); return; }

  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.BLEND);

  // ── Compile Shader ──
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Prism shader error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const vertSrc = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;

  const fragSrc = `
    precision highp float;

    uniform vec2  iResolution;
    uniform float iTime;
    uniform mat3  uRot;
    uniform float uGlow;
    uniform float uNoise;
    uniform float uSaturation;
    uniform float uHueShift;
    uniform float uColorFreq;
    uniform float uBloom;
    uniform float uCenterShift;
    uniform float uInvBaseHalf;
    uniform float uInvHeight;
    uniform float uMinAxis;
    uniform float uPxScale;

    vec4 tanh4(vec4 x) {
      vec4 e2x = exp(2.0 * x);
      return (e2x - 1.0) / (e2x + 1.0);
    }

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float sdOctaAnisoInv(vec3 p) {
      vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
      float m = q.x + q.y + q.z - 1.0;
      return m * uMinAxis * 0.5773502691896258;
    }

    float sdPyramidUpInv(vec3 p) {
      return max(sdOctaAnisoInv(p), -p.y);
    }

    mat3 hueRotation(float a) {
      float c = cos(a), s = sin(a);
      mat3 W = mat3(0.299,0.587,0.114, 0.299,0.587,0.114, 0.299,0.587,0.114);
      mat3 U = mat3(0.701,-0.587,-0.114, -0.299,0.413,-0.114, -0.300,-0.588,0.886);
      mat3 V = mat3(0.168,-0.331,0.500, 0.328,0.035,-0.500, -0.497,0.296,0.201);
      return W + U * c + V * s;
    }

    void main() {
      vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy) * uPxScale;
      float z = 5.0;
      float d = 0.0;
      vec3 p;
      vec4 o = vec4(0.0);

      for (int i = 0; i < 100; i++) {
        p = uRot * vec3(f, z);
        vec3 q = p;
        q.y += uCenterShift;
        d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
        z -= d;
        o += (sin((p.y + z) * uColorFreq + vec4(0,1,2,3)) + 1.0) / d;
      }

      o = tanh4(o * o * (uGlow * uBloom) / 1e5);
      vec3 col = o.rgb;
      col += (rand(gl_FragCoord.xy + vec2(iTime)) - 0.5) * uNoise;
      col = clamp(col, 0.0, 1.0);
      float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);
      if (abs(uHueShift) > 0.0001) col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
      gl_FragColor = vec4(col, o.a);
    }
  `;

  const vs = compile(gl.VERTEX_SHADER, vertSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Prism link error:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  // ── Fullscreen Triangle (covers viewport with a single triangle) ──
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(prog, 'position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // ── Uniform Locations ──
  const loc = {};
  ['iResolution','iTime','uRot','uGlow','uNoise','uSaturation',
   'uHueShift','uColorFreq','uBloom','uCenterShift',
   'uInvBaseHalf','uInvHeight','uMinAxis','uPxScale'].forEach(name => {
    loc[name] = gl.getUniformLocation(prog, name);
  });

  // ── Set Static Uniforms ──
  gl.uniform1f(loc.uGlow, GLOW);
  gl.uniform1f(loc.uNoise, NOISE);
  gl.uniform1f(loc.uSaturation, SAT);
  gl.uniform1f(loc.uHueShift, HUE_SHIFT);
  gl.uniform1f(loc.uColorFreq, COLOR_FREQ);
  gl.uniform1f(loc.uBloom, BLOOM);
  gl.uniform1f(loc.uCenterShift, HEIGHT * 0.25);
  gl.uniform1f(loc.uInvBaseHalf, 1 / BASE_HALF);
  gl.uniform1f(loc.uInvHeight, 1 / HEIGHT);
  gl.uniform1f(loc.uMinAxis, Math.min(BASE_HALF, HEIGHT));

  // ── Resize ──
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(loc.iResolution, canvas.width, canvas.height);
    // Zoom out on mobile so the prism isn't as concentrated/intense
    const scale = w <= 768 ? SCALE * 0.55 : SCALE;
    gl.uniform1f(loc.uPxScale, 1 / (canvas.height * 0.1 * scale));
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ── 3D Rotate Animation ──
  const rotBuf = new Float32Array(9);
  const rnd = Math.random;
  const wX = 0.3 + rnd() * 0.6;
  const wY = 0.2 + rnd() * 0.7;
  const wZ = 0.1 + rnd() * 0.5;
  const phX = rnd() * Math.PI * 2;
  const phZ = rnd() * Math.PI * 2;

  function euler(yaw, pitch, roll, out) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cx = Math.cos(pitch), sx = Math.sin(pitch);
    const cz = Math.cos(roll), sz = Math.sin(roll);
    out[0] = cy*cz + sy*sx*sz;  out[3] = -cy*sz + sy*sx*cz;  out[6] = sy*cx;
    out[1] = cx*sz;              out[4] = cx*cz;               out[7] = -sx;
    out[2] = -sy*cz + cy*sx*sz; out[5] = sy*sz + cy*sx*cz;    out[8] = cy*cx;
  }

  // ── Render Loop ──
  let raf = 0;
  const t0 = performance.now();

  function render(t) {
    const time = (t - t0) * 0.001;
    gl.uniform1f(loc.iTime, time);

    const ts = time * TIME_SCALE;
    euler(ts * wY, Math.sin(ts * wX + phX) * 0.6, Math.sin(ts * wZ + phZ) * 0.5, rotBuf);
    gl.uniformMatrix3fv(loc.uRot, false, rotBuf);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(render);
  }

  // ── Suspend when offscreen ──
  const io = new IntersectionObserver(entries => {
    const vis = entries.some(e => e.isIntersecting);
    if (vis && !raf) raf = requestAnimationFrame(render);
    else if (!vis && raf) { cancelAnimationFrame(raf); raf = 0; }
  });
  io.observe(container);
  raf = requestAnimationFrame(render);
}
