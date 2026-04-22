
/* ==========================================================================
   Brand Distortion — Hybrid: 2D canvas text + WebGL barrel distortion
   Two static lines auto-scaled to fill width, footer gradient text color,
   per-pixel prism lens via WebGL shader on hover.
   ========================================================================== */

function initBrandDistortion() {
  var container = document.getElementById('brand-distortion');
  if (!container) return;
  var section = container.closest('.brand-moment');
  if (!section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.fonts.ready.then(function() { setupDistortion(container, section); });
}

function setupDistortion(container, section) {
  var LINE1 = 'ILLUMINATING BRANDS';
  var LINE2 = 'AMPLIFYING GROWTH';
  var TRAIL_COUNT = 20;

  container.textContent = '';

  // ── Visible WebGL canvas ──
  var glCanvas = document.createElement('canvas');
  Object.assign(glCanvas.style, {
    position: 'absolute', inset: '0',
    width: '100%', height: '100%', display: 'block'
  });
  container.appendChild(glCanvas);

  var gl = glCanvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return;

  // ── Offscreen 2D canvas for text ──
  var textCanvas = document.createElement('canvas');
  var textCtx = textCanvas.getContext('2d');

  // ── State ──
  var dpr = 1, W = 1, H = 1;
  var mouseX = 0.5, mouseY = 0.5;
  var smoothX = 0.5, smoothY = 0.5;
  var prevX = 0.5, prevY = 0.5;
  var smoothVelocity = 0;
  var hover = 0, targetHover = 0;
  var raf = 0, lastTime = performance.now();

  // ── Trail ──
  var trailPos = new Float32Array(TRAIL_COUNT * 2);
  var trailAlpha = new Float32Array(TRAIL_COUNT);
  var lastTrailTime = 0;
  for (var i = 0; i < TRAIL_COUNT; i++) {
    trailPos[i * 2] = 0.5; trailPos[i * 2 + 1] = 0.5;
  }

  // ── Measure & fit text to width ──
  function fitFontSize(text, maxW) {
    // Binary search for the font size that fills the width
    var lo = 10, hi = 400, mid;
    for (var i = 0; i < 20; i++) {
      mid = (lo + hi) / 2;
      textCtx.font = '700 ' + mid + 'px "adelphi-pe-variable", sans-serif';
      if (textCtx.measureText(text).width > maxW) hi = mid;
      else lo = mid;
    }
    return lo;
  }

  function renderText() {
    var ss = 2;
    textCanvas.width = Math.round(W * dpr * ss);
    textCanvas.height = Math.round(H * dpr * ss);
    textCtx.setTransform(dpr * ss, 0, 0, dpr * ss, 0, 0);
    textCtx.clearRect(0, 0, W, H);

    var isMobile = window.matchMedia('(max-width: 767px)').matches;
    var lines = isMobile
      ? ['ILLUMINATING', 'BRANDS', 'AMPLIFYING', 'GROWTH']
      : [LINE1, LINE2];
    var pad = W * (isMobile ? 0.035 : 0.01);
    var usableW = W - pad * 2;
    var lineGap = H * (isMobile ? 0.006 : 0.012);
    var topPad = H * (isMobile ? 0.08 : 0.12);
    var bottomPad = Math.max(2, H * (isMobile ? 0.008 : 0.01));
    var usableH = H - topPad - bottomPad;
    var fontSizes = [];
    var totalH = 0;

    for (var i = 0; i < lines.length; i++) {
      var fitted = fitFontSize(lines[i], usableW);
      fontSizes.push(fitted);
      totalH += fitted * 0.75;
    }

    totalH += (lines.length - 1) * lineGap;

    if (totalH > usableH) {
      var scale = usableH / totalH;
      totalH = 0;
      for (var j = 0; j < fontSizes.length; j++) {
        fontSizes[j] *= scale;
        totalH += fontSizes[j] * 0.75;
      }
      totalH += (lines.length - 1) * lineGap;
    }

    // Footer gradient: #292831 → #414046 → #4b4a4e
    var grad = textCtx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#292831');
    grad.addColorStop(0.5, '#414046');
    grad.addColorStop(1, '#4b4a4e');

    textCtx.textBaseline = 'alphabetic';
    textCtx.textAlign = isMobile ? 'center' : 'left';

    var startY = H - bottomPad - totalH;
    textCtx.fillStyle = grad;
    var textX = isMobile ? W / 2 : pad;

    var currentY = startY;
    for (var k = 0; k < lines.length; k++) {
      textCtx.font = '700 ' + fontSizes[k] + 'px "adelphi-pe-variable", sans-serif';
      currentY += fontSizes[k] * 0.72;
      textCtx.fillText(lines[k], textX, currentY);
      currentY += fontSizes[k] * 0.03 + lineGap;
    }
  }

  // ── WebGL shader ──
  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('brand-distortion:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vertSrc = 'attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}';

  var fragSrc = [
    'precision mediump float;',
    'uniform sampler2D uText;',
    'uniform vec2  uRes;',
    'uniform vec2  uMouse;',
    'uniform float uVel;',
    'uniform float uTime;',
    'uniform float uHover;',
    'uniform vec2  uTrail[' + TRAIL_COUNT + '];',
    'uniform float uTrailA[' + TRAIL_COUNT + '];',
    '',
    'const vec3 BG=vec3(0.129,0.141,0.161);',
    'const vec3 C_B=vec3(0.263,0.663,0.875);',
    'const vec3 C_V=vec3(0.557,0.408,0.678);',
    'const vec3 C_C=vec3(0.761,0.863,0.831);',
    '',
    'vec3 pal(float t){',
    '  t=fract(t);',
    '  if(t<.333)return mix(C_B,C_V,t*3.);',
    '  if(t<.666)return mix(C_V,C_C,(t-.333)*3.);',
    '  return mix(C_C,C_B,(t-.666)*3.);',
    '}',
    '',
    '// Sample text — returns RGB (gradient-colored text)',
    'vec3 txtRGB(vec2 uv){',
    '  if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return vec3(0.);',
    '  return texture2D(uText,uv).rgb;',
    '}',
    'float txtA(vec2 uv){',
    '  vec3 c=txtRGB(uv);',
    '  return max(max(c.r,c.g),c.b);',
    '}',
    '',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/uRes;',
    '  uv.y=1.-uv.y;',
    '  float ar=uRes.x/uRes.y;',
    '  vec2 asp=vec2(ar,1.);',
    '',
    '  // ── Trail ──',
    '  vec3 trail=vec3(0.);',
    '  for(int i=0;i<' + TRAIL_COUNT + ';i++){',
    '    float a=uTrailA[i];',
    '    if(a<.005)continue;',
    '    float d=distance(uv*asp,uTrail[i]*asp);',
    '    float blob=smoothstep(.22,.0,d)*a;',
    '    trail+=pal(float(i)/20.+uTime*.15)*blob;',
    '  }',
    '',
    '  // ── Lens ──',
    '  float dist=distance(uv*asp,uMouse*asp);',
    '  float spd=uVel;',
    '  float lensR=.25+spd*.15;',
    '  float inL=smoothstep(lensR,lensR*.05,dist)*uHover;',
    '  float nd=clamp(dist/lensR,0.,1.);',
    '  float k=inL*(.8+spd*.7);',
    '  float r2=nd*nd;',
    '',
    '  vec2 toM=uv-uMouse;',
    '  vec2 dR=uMouse+toM/(1.+k*.3*r2);',
    '  vec2 dG=uMouse+toM/(1.+k*1.*r2);',
    '  vec2 dB=uMouse+toM/(1.+k*2.2*r2);',
    '',
    '  // Sample each channel from differently distorted UVs',
    '  vec3 cR=txtRGB(dR);',
    '  vec3 cG=txtRGB(dG);',
    '  vec3 cB=txtRGB(dB);',
    '  vec3 cN=txtRGB(uv);',
    '',
    '  // Chromatic split: take r from red-offset, g from green-offset, b from blue-offset',
    '  vec3 tc;',
    '  tc.r=mix(cN.r,cR.r,inL);',
    '  tc.g=mix(cN.g,cG.g,inL);',
    '  tc.b=mix(cN.b,cB.b,inL);',
    '',
    '  // ── Compose ──',
    '  float tm=max(max(tc.r,tc.g),tc.b);',
    '  vec3 c=BG;',
    '  c+=trail*(1.-tm*.6);',
    '  c+=tc;',
    '',
    '  float fade=smoothstep(0.,.06,uv.x)*smoothstep(1.,.94,uv.x)',
    '           *smoothstep(0.,.12,uv.y)*smoothstep(1.,.88,uv.y);',
    '  c=mix(BG,c,fade);',
    '',
    '  gl_FragColor=vec4(c,1.);',
    '}'
  ].join('\n');

  var vs = compile(gl.VERTEX_SHADER, vertSrc);
  var fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('brand-distortion link:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  var pLoc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pLoc);
  gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

  var loc = {};
  ['uRes','uMouse','uVel','uTime','uHover','uText'].forEach(function(n) {
    loc[n] = gl.getUniformLocation(prog, n);
  });
  loc.uTrail = gl.getUniformLocation(prog, 'uTrail');
  loc.uTrailA = gl.getUniformLocation(prog, 'uTrailA');

  var tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(loc.uText, 0);

  // ── Resize ──
  var textDirty = true;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, container.clientWidth);
    H = Math.max(1, container.clientHeight);
    glCanvas.width = Math.round(W * dpr);
    glCanvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.uniform2f(loc.uRes, glCanvas.width, glCanvas.height);
    textDirty = true;
  }

  // ── Input ──
  function onPointerMove(e) {
    var pt = e.touches ? e.touches[0] : e;
    var rect = section.getBoundingClientRect();
    mouseX = (pt.clientX - rect.left) / rect.width;
    mouseY = (pt.clientY - rect.top) / rect.height;
    targetHover = 1;
  }
  section.addEventListener('mousemove', onPointerMove);
  section.addEventListener('touchmove', onPointerMove, { passive: true });
  section.addEventListener('mouseenter', onPointerMove);
  section.addEventListener('mouseleave', function() { targetHover = 0; });
  section.addEventListener('touchstart', onPointerMove, { passive: true });
  section.addEventListener('touchend', function() { targetHover = 0; });

  // ── Trail update ──
  function updateTrail(now) {
    if (now - lastTrailTime < 20) return;
    lastTrailTime = now;
    for (var i = TRAIL_COUNT - 1; i > 0; i--) {
      trailPos[i*2] = trailPos[(i-1)*2];
      trailPos[i*2+1] = trailPos[(i-1)*2+1];
      trailAlpha[i] = trailAlpha[i-1] * 0.88;
    }
    trailPos[0] = smoothX;
    trailPos[1] = smoothY;
    trailAlpha[0] = hover > 0.1 ? Math.min(smoothVelocity * 1.5, 1.0) : 0;
  }

  // ── Render ──
  function render(now) {
    var dt = Math.min((now - lastTime) * 0.001, 0.05);
    lastTime = now;

    smoothX += (mouseX - smoothX) * 0.12;
    smoothY += (mouseY - smoothY) * 0.12;

    var dx = smoothX - prevX;
    var dy = smoothY - prevY;
    var vel = Math.sqrt(dx*dx + dy*dy) * 80;
    smoothVelocity += (vel - smoothVelocity) * 0.15;
    smoothVelocity = Math.min(smoothVelocity, 4.0);
    prevX = smoothX;
    prevY = smoothY;

    hover += (targetHover - hover) * 0.15;

    updateTrail(now);

    // Only re-render text on resize (static, no scroll)
    if (textDirty) {
      renderText();
      textDirty = false;
    }

    // Upload text texture
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);

    gl.uniform2f(loc.uMouse, smoothX, smoothY);
    gl.uniform1f(loc.uVel, smoothVelocity);
    gl.uniform1f(loc.uTime, now * 0.001);
    gl.uniform1f(loc.uHover, hover);
    gl.uniform2fv(loc.uTrail, trailPos);
    gl.uniform1fv(loc.uTrailA, trailAlpha);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(render);
  }

  var ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  var io = new IntersectionObserver(function(entries) {
    var vis = entries.some(function(e) { return e.isIntersecting; });
    if (vis && !raf) { lastTime = performance.now(); raf = requestAnimationFrame(render); }
    else if (!vis && raf) { cancelAnimationFrame(raf); raf = 0; }
  });
  io.observe(section);
  raf = requestAnimationFrame(render);
}
