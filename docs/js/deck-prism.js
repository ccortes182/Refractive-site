/* ==========================================================================
   Deck Prism Background — WebGL refraction shader
   Always-running animation with tweakable uniforms for GSAP morphing
   ========================================================================== */

function initDeckPrism(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return null;

  var HEIGHT = 3.5;
  var BASE_HALF = 5.5 * 0.5;
  var SCALE = 3.6;

  var params = {
    glow: 1.0,
    noise: 0.5,
    saturation: 1.5,
    hueShift: 0.0,
    colorFreq: 1.0,
    bloom: 1.0,
    timeScale: 0.5
  };

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  container.appendChild(canvas);

  var gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return null;

  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.BLEND);

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Prism shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vertSrc = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}';

  var fragSrc = [
    'precision highp float;',
    'uniform vec2 iResolution;uniform float iTime;uniform mat3 uRot;',
    'uniform float uGlow,uNoise,uSaturation,uHueShift,uColorFreq,uBloom;',
    'uniform float uCenterShift,uInvBaseHalf,uInvHeight,uMinAxis,uPxScale;',
    'vec4 tanh4(vec4 x){vec4 e=exp(2.0*x);return(e-1.0)/(e+1.0);}',
    'float rand(vec2 co){return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453);}',
    'float sdOcta(vec3 p){vec3 q=vec3(abs(p.x)*uInvBaseHalf,abs(p.y)*uInvHeight,abs(p.z)*uInvBaseHalf);return(q.x+q.y+q.z-1.0)*uMinAxis*0.577;}',
    'float sdPyr(vec3 p){return max(sdOcta(p),-p.y);}',
    'mat3 hueRot(float a){float c=cos(a),s=sin(a);',
    'mat3 W=mat3(.299,.587,.114,.299,.587,.114,.299,.587,.114);',
    'mat3 U=mat3(.701,-.587,-.114,-.299,.413,-.114,-.3,-.588,.886);',
    'mat3 V=mat3(.168,-.331,.5,.328,.035,-.5,-.497,.296,.201);',
    'return W+U*c+V*s;}',
    'void main(){',
    'vec2 f=(gl_FragCoord.xy-0.5*iResolution.xy)*uPxScale;',
    'float z=5.0,d=0.0;vec3 p;vec4 o=vec4(0.0);',
    'for(int i=0;i<100;i++){p=uRot*vec3(f,z);vec3 q=p;q.y+=uCenterShift;',
    'd=0.1+0.2*abs(sdPyr(q));z-=d;o+=(sin((p.y+z)*uColorFreq+vec4(0,1,2,3))+1.0)/d;}',
    'o=tanh4(o*o*(uGlow*uBloom)/1e5);vec3 col=o.rgb;',
    'col+=(rand(gl_FragCoord.xy+vec2(iTime))-0.5)*uNoise;col=clamp(col,0.0,1.0);',
    'float L=dot(col,vec3(.2126,.7152,.0722));col=clamp(mix(vec3(L),col,uSaturation),0.0,1.0);',
    'if(abs(uHueShift)>0.0001)col=clamp(hueRot(uHueShift)*col,0.0,1.0);',
    'gl_FragColor=vec4(col,o.a);}'
  ].join('\n');

  var vs = compile(gl.VERTEX_SHADER, vertSrc);
  var fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return null;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  var posLoc = gl.getAttribLocation(prog, 'position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  var loc = {};
  ['iResolution','iTime','uRot','uGlow','uNoise','uSaturation',
   'uHueShift','uColorFreq','uBloom','uCenterShift',
   'uInvBaseHalf','uInvHeight','uMinAxis','uPxScale'].forEach(function(name) {
    loc[name] = gl.getUniformLocation(prog, name);
  });

  gl.uniform1f(loc.uCenterShift, HEIGHT * 0.25);
  gl.uniform1f(loc.uInvBaseHalf, 1 / BASE_HALF);
  gl.uniform1f(loc.uInvHeight, 1 / HEIGHT);
  gl.uniform1f(loc.uMinAxis, Math.min(BASE_HALF, HEIGHT));

  var dpr = Math.min(window.innerWidth < 768 ? 1.0 : 2, window.devicePixelRatio || 1);

  function resize() {
    var w = container.clientWidth || 1;
    var h = container.clientHeight || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(loc.iResolution, canvas.width, canvas.height);
    gl.uniform1f(loc.uPxScale, 1 / (canvas.height * 0.1 * SCALE));
  }

  var ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  var rotBuf = new Float32Array(9);
  var wX = 0.3 + Math.random() * 0.6;
  var wY = 0.2 + Math.random() * 0.7;
  var wZ = 0.1 + Math.random() * 0.5;
  var phX = Math.random() * Math.PI * 2;
  var phZ = Math.random() * Math.PI * 2;

  function euler(yaw, pitch, roll, out) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var cx = Math.cos(pitch), sx = Math.sin(pitch);
    var cz = Math.cos(roll), sz = Math.sin(roll);
    out[0]=cy*cz+sy*sx*sz; out[3]=-cy*sz+sy*sx*cz; out[6]=sy*cx;
    out[1]=cx*sz;           out[4]=cx*cz;            out[7]=-sx;
    out[2]=-sy*cz+cy*sx*sz; out[5]=sy*sz+cy*sx*cz;   out[8]=cy*cx;
  }

  var raf = 0;
  var t0 = performance.now();

  function render(t) {
    var time = (t - t0) * 0.001;
    gl.uniform1f(loc.iTime, time);
    gl.uniform1f(loc.uGlow, params.glow);
    gl.uniform1f(loc.uNoise, params.noise);
    gl.uniform1f(loc.uSaturation, params.saturation);
    gl.uniform1f(loc.uHueShift, params.hueShift);
    gl.uniform1f(loc.uColorFreq, params.colorFreq);
    gl.uniform1f(loc.uBloom, params.bloom);

    var ts = time * params.timeScale;
    euler(ts * wY, Math.sin(ts * wX + phX) * 0.6, Math.sin(ts * wZ + phZ) * 0.5, rotBuf);
    gl.uniformMatrix3fv(loc.uRot, false, rotBuf);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(render);
  }

  var io = new IntersectionObserver(function(entries) {
    var vis = entries.some(function(e) { return e.isIntersecting; });
    if (vis && !raf) raf = requestAnimationFrame(render);
    else if (!vis && raf) { cancelAnimationFrame(raf); raf = 0; }
  });
  io.observe(container);
  raf = requestAnimationFrame(render);

  return { params: params };
}
