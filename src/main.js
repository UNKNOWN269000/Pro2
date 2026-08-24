import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ------------------------------------------------------------------ *
 *  Constants
 * ------------------------------------------------------------------ */
const CYAN = new THREE.Color('#00f0ff');
const PURPLE = new THREE.Color('#7c3aed');
const HEAD_Y = 3.45;   // head centre
const HEAD_TOP = 3.95;
const FEET_Y = 0.0;

/* ------------------------------------------------------------------ *
 *  Renderer / Scene / Camera
 * ------------------------------------------------------------------ */
const container = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#050814');
scene.fog = new THREE.FogExp2('#050814', 0.018);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, HEAD_Y, 3.4);

/* ------------------------------------------------------------------ *
 *  Post-processing (bloom)
 * ------------------------------------------------------------------ */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.85,   // strength
  0.55,   // radius
  0.22    // threshold
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ------------------------------------------------------------------ *
 *  Holographic body shader  (shared by all body parts)
 * ------------------------------------------------------------------ */
const holoVertex = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const holoFragment = /* glsl */ `
  uniform vec3  uColor;
  uniform float uRevealY;
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    float fresnel = pow(1.0 - abs(dot(N, V)), 2.4);

    // horizontal scanlines
    float scan = sin(vWorldPos.y * 46.0 + uTime * 3.0) * 0.5 + 0.5;

    // holographic dot matrix (screen-ish projected on xz)
    vec2 cell = fract(vWorldPos.xz * 7.0) - 0.5;
    float dots = step(length(cell), 0.16);

    // travelling scan band
    float band = smoothstep(0.0, 0.14, sin((vWorldPos.y - uTime * 1.4) * 2.6));

    // dissolve reveal driven by the moving energy line
    float alpha = smoothstep(uRevealY - 0.55, uRevealY + 0.55, vWorldPos.y);
    alpha *= uOpacity;

    vec3 col = uColor * (0.34 + fresnel * 1.55 + scan * 0.10 + band * 0.45);
    col += uColor * dots * 0.30;

    gl_FragColor = vec4(col, alpha);
  }
`;

function makeHoloMaterial(hex) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: holoVertex,
    fragmentShader: holoFragment,
    uniforms: {
      uColor: { value: new THREE.Color(hex) },
      uRevealY: { value: HEAD_TOP + 1.0 },
      uTime: { value: 0 },
      uOpacity: { value: 1.0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return mat;
}

const holoMaterials = [];
function track(mat) { holoMaterials.push(mat); return mat; }

/* ------------------------------------------------------------------ *
 *  Face shader (the 3D "me" — photo projected as a hologram)
 * ------------------------------------------------------------------ */
const faceVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const faceFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3  uTint;
  uniform float uTime;
  uniform float uRevealY;
  uniform float uHasPhoto;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vec4 tex = texture2D(uMap, vUv);

    // soft rounded-edge mask so the photo melts into the head
    vec2 c = vUv - 0.5;
    float mask = 1.0 - smoothstep(0.30, 0.5, length(c * vec2(1.0, 1.05)));

    // scanlines + flicker
    float scan = sin(vUv.y * 150.0 + uTime * 5.0) * 0.5 + 0.5;
    float flick = 0.92 + 0.08 * sin(uTime * 26.0 + vUv.y * 34.0);

    vec3 col = tex.rgb;
    col = mix(col, uTint, 0.34);            // holographic tint
    col *= (0.72 + scan * 0.26);
    col += uTint * 0.10;

    float alpha = mask * flick;
    alpha *= smoothstep(uRevealY - 0.5, uRevealY + 0.5, vWorldPos.y);

    gl_FragColor = vec4(col, alpha);
  }
`;

const faceUniforms = {
  uMap: { value: null },
  uTint: { value: new THREE.Color('#00f0ff') },
  uTime: { value: 0 },
  uRevealY: { value: HEAD_TOP + 1.0 },
  uHasPhoto: { value: 0 },
};

const faceMaterial = new THREE.ShaderMaterial({
  vertexShader: faceVertex,
  fragmentShader: faceFragment,
  uniforms: faceUniforms,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});

/* ------------------------------------------------------------------ *
 *  Build the avatar
 * ------------------------------------------------------------------ */
const avatar = new THREE.Group();
scene.add(avatar);

function holo(mesh, hex) {
  mesh.material = track(makeHoloMaterial(hex));
  mesh.renderOrder = 1;
  return mesh;
}

// --- head ---
const headGeo = new THREE.SphereGeometry(0.5, 48, 32);
const head = holo(new THREE.Mesh(headGeo), '#00cfe0');
head.position.set(0, HEAD_Y, 0);
avatar.add(head);

// wireframe shell around the head
const headWire = new THREE.LineSegments(
  new THREE.WireframeGeometry(new THREE.SphereGeometry(0.545, 24, 16)),
  new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })
);
headWire.position.copy(head.position);
avatar.add(headWire);

// --- face card (photo) ---
const faceW = 0.56, faceH = 0.72, faceSeg = 18;
const faceGeo = new THREE.PlaneGeometry(faceW, faceH, faceSeg, faceSeg);
{
  const pos = faceGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const nx = x / (faceW / 2), ny = y / (faceH / 2);
    const bend = 0.11;
    pos.setZ(i, -bend * nx * nx - 0.02 * ny * ny);
  }
  faceGeo.computeVertexNormals();
}
const faceMesh = new THREE.Mesh(faceGeo, faceMaterial);
faceMesh.position.set(0, HEAD_Y, 0.5);
faceMesh.renderOrder = 2;
avatar.add(faceMesh);

// --- neck ---
const neck = holo(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.34, 20)), '#00cfe0');
neck.position.set(0, 2.95, 0);
avatar.add(neck);

// --- torso (chest) ---
const torso = holo(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.45, 1.3, 28)), '#00cfe0');
torso.position.set(0, 2.18, 0);
avatar.add(torso);

// --- shoulders ---
for (const s of [-1, 1]) {
  const shoulder = holo(new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16)), '#00cfe0');
  shoulder.position.set(s * 0.5, 2.78, 0);
  avatar.add(shoulder);
}

// --- arms ---
for (const s of [-1, 1]) {
  const arm = holo(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 1.15, 16)), '#7c3aed');
  arm.position.set(s * 0.62, 2.05, 0);
  arm.rotation.z = s * -0.12;
  avatar.add(arm);
  const hand = holo(new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12)), '#7c3aed');
  hand.position.set(s * 0.66, 1.5, 0);
  avatar.add(hand);
}

// --- pelvis ---
const pelvis = holo(new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 16)), '#7c3aed');
pelvis.position.set(0, 1.52, 0);
avatar.add(pelvis);

// --- legs ---
for (const s of [-1, 1]) {
  const leg = holo(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 1.35, 16)), '#00cfe0');
  leg.position.set(s * 0.22, 0.82, 0);
  avatar.add(leg);
  const foot = holo(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.52), '#7c3aed'));
  foot.position.set(s * 0.22, 0.08, 0.09);
  avatar.add(foot);
}

// chest core glow line
const core = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 16, 12),
  new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
);
core.position.set(0, 2.4, 0.34);
avatar.add(core);

/* ------------------------------------------------------------------ *
 *  HUD rings + reticle around the head
 * ------------------------------------------------------------------ */
const hud = new THREE.Group();
hud.position.set(0, HEAD_Y, 0);
avatar.add(hud);

const ringMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.012, 12, 90), ringMat);
ring1.rotation.x = Math.PI / 2.2;
hud.add(ring1);
const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.008, 12, 90), ringMat);
ring2.rotation.x = Math.PI / 1.6;
ring2.rotation.y = 0.6;
hud.add(ring2);

// reticle (targeting frame in front of the face)
const reticle = new THREE.Group();
reticle.position.set(0, 0, 1.0);
hud.add(reticle);
const retRing = new THREE.Mesh(
  new THREE.RingGeometry(0.14, 0.17, 48),
  new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
);
reticle.add(retRing);
for (const rot of [0, Math.PI / 2]) {
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.008, 0.01),
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  bar.rotation.z = rot;
  reticle.add(bar);
}

/* ------------------------------------------------------------------ *
 *  Particle field
 * ------------------------------------------------------------------ */
const pCount = 420;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(pCount * 3);
const pCol = new Float32Array(pCount * 3);
for (let i = 0; i < pCount; i++) {
  pPos[i * 3 + 0] = (Math.random() - 0.5) * 14;
  pPos[i * 3 + 1] = Math.random() * 7 - 1;
  pPos[i * 3 + 2] = (Math.random() - 0.5) * 9 - 1;
  const c = Math.random() > 0.5 ? CYAN : PURPLE;
  pCol[i * 3 + 0] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const pMat = new THREE.PointsMaterial({
  size: 0.035, vertexColors: true, transparent: true, opacity: 0.85,
  blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
});
const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);

/* ------------------------------------------------------------------ *
 *  Grid floor + backdrop glow
 * ------------------------------------------------------------------ */
const grid = new THREE.GridHelper(60, 60, 0x00f0ff, 0x1a2b55);
grid.position.y = -0.06;
grid.material.transparent = true;
grid.material.opacity = 0.22;
grid.material.blending = THREE.AdditiveBlending;
grid.material.depthWrite = false;
scene.add(grid);

const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv;
      void main(){
        vec3 c = vec3(0.015, 0.02, 0.05);
        float d1 = distance(vUv, vec2(0.5, 0.46));
        c += vec3(0.0, 0.45, 0.62) * exp(-d1 * 3.6) * 0.22;
        float d2 = distance(vUv, vec2(0.5, 0.08));
        c += vec3(0.42, 0.14, 0.72) * exp(-d2 * 4.2) * 0.16;
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthWrite: false,
  })
);
backdrop.position.set(0, 1.8, -8);
scene.add(backdrop);

/* ------------------------------------------------------------------ *
 *  Photo texture
 * ------------------------------------------------------------------ */
const FACE_CANDIDATES = ['/me.jpg', '/me.png'];
const texLoader = new THREE.TextureLoader();
function makeFallbackTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
  g.addColorStop(0, '#0b1a30');
  g.addColorStop(1, '#04060f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(0,240,255,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(256, 256, 150, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 150px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('JN', 256, 256);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function loadFace(idx) {
  // try me.jpg first, then me.png — anything else falls back to the monogram card
  if (idx >= FACE_CANDIDATES.length) {
    faceUniforms.uMap.value = makeFallbackTexture();
    faceUniforms.uHasPhoto.value = 0;
    return;
  }
  texLoader.load(
    FACE_CANDIDATES[idx],
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      faceUniforms.uMap.value = tex;
      faceUniforms.uHasPhoto.value = 1;
      const aspect = (tex.image.width / tex.image.height) || 0.78;
      const scaleX = THREE.MathUtils.clamp((faceH * aspect) / faceW, 0.8, 1.55);
      faceMesh.scale.set(scaleX, 1, 1);
    },
    undefined,
    () => { loadFace(idx + 1); }
  );
}
loadFace(0);
if (!faceUniforms.uMap.value) faceUniforms.uMap.value = makeFallbackTexture();

/* ------------------------------------------------------------------ *
 *  DOM refs
 * ------------------------------------------------------------------ */
const sections = [
  { el: document.getElementById('sec-hero'), in: [0, 0.04], out: [0.1, 0.16] },
  { el: document.getElementById('sec-skills'), in: [0.48, 0.56], out: [0.64, 0.72] },
  { el: document.getElementById('sec-about'), in: [0.7, 0.76], out: [0.82, 0.88] },
  { el: document.getElementById('sec-contact'), in: [0.86, 0.9], out: [0.99, 1.04] },
];
const hudEl = document.getElementById('hud');
const chipTop = document.getElementById('chipTop');
const chipLeft = document.getElementById('chipLeft');
const chipRight = document.getElementById('chipRight');
const chipScan = document.getElementById('chipScan');
const scrollFill = document.getElementById('scrollFill');
const loader = document.getElementById('loader');
const loaderPct = document.getElementById('loaderPct');
const barFills = document.querySelectorAll('.bar b i');
const codeStream = document.querySelector('[data-code-stream] code');
const terminalFeed = document.getElementById('terminalFeed');
const metricCpu = document.getElementById('metricCpu');
const metricNet = document.getElementById('metricNet');
const metricUi = document.getElementById('metricUi');

const codeSnippets = [
  "const portfolio = new Hologram({ status: 'online' });\nawait portfolio.scanAvatar();\nrenderSkills(['React', 'TypeScript', 'SQL']);\nconnect('/contact', { secure: true });",
  "function buildInterface(user) {\n  const glow = shader.compile('cyan-bloom');\n  return deploy({ user, mode: 'futuristic' });\n}\nbuildInterface('Jaseem');",
  "SELECT skill, level FROM matrix\nWHERE profile = 'Jaseem Nizardeen';\nUPDATE ui SET state = 'running'\nCOMMIT TRANSMISSION;",
  "interface Project {\n  stack: ['HTML', 'CSS', 'JavaScript'];\n  responseTime: 'fast';\n  status: 'ready';\n}"
];
const terminalLines = [
  'avatar mesh synchronized',
  'programming UI stream running',
  'shader bloom pipeline stable',
  'contact uplink encrypted',
  'code matrix refreshed',
  'portfolio telemetry online'
];

const chipPoints = [
  { el: chipTop, p: new THREE.Vector3(0, 4.18, 0) },
  { el: chipLeft, p: new THREE.Vector3(-1.06, HEAD_Y, 0) },
  { el: chipRight, p: new THREE.Vector3(1.06, HEAD_Y - 0.25, 0) },
];

function smoothstep(a, b, x) {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function band(p, inn, outn) {
  return smoothstep(inn[0], inn[1], p) * (1 - smoothstep(outn[0], outn[1], p));
}
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ------------------------------------------------------------------ *
 *  Scroll
 * ------------------------------------------------------------------ */
let target = 0, current = 0;
function onScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  target = max > 0 ? window.scrollY / max : 0;
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);

let isMobile = window.innerWidth < 820;
function onResize() {
  isMobile = window.innerWidth < 820;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

/* ------------------------------------------------------------------ *
 *  Main loop
 * ------------------------------------------------------------------ */
const clock = new THREE.Clock();
const lookTarget = new THREE.Vector3();
const v = new THREE.Vector3();
let loaderDone = false;
let loaderP = 0;
let codeTick = 0;
let terminalTick = 0;
let codeIndex = 0;

function updateProgrammingUi(t) {
  if (codeStream && t - codeTick > 2.35) {
    codeTick = t;
    codeIndex = (codeIndex + 1) % codeSnippets.length;
    codeStream.textContent = codeSnippets[codeIndex];
  }
  if (terminalFeed && t - terminalTick > 1.25) {
    terminalTick = t;
    const line = document.createElement('p');
    line.innerHTML = `<em>&gt;</em> ${terminalLines[Math.floor(t * 10) % terminalLines.length]}`;
    terminalFeed.appendChild(line);
    while (terminalFeed.children.length > 4) terminalFeed.removeChild(terminalFeed.firstElementChild);
  }
  if (metricCpu) metricCpu.textContent = `${Math.floor(38 + Math.sin(t * 1.7) * 16 + Math.sin(t * 4.1) * 4)}%`;
  if (metricNet) metricNet.textContent = `${Math.floor(16 + Math.sin(t * 2.2) * 7)}ms`;
  if (metricUi) metricUi.textContent = Math.sin(t * 3) > -0.2 ? 'SYNC' : 'RUN';
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  updateProgrammingUi(t);

  // smooth scroll
  current += (target - current) * 0.08;
  const p = current;

  // camera path
  const travel = THREE.MathUtils.clamp(p / 0.4, 0, 1);
  const e = easeInOut(travel);
  const camY = THREE.MathUtils.lerp(3.45, 0.95, e);
  const camZ = THREE.MathUtils.lerp(3.4, 5.5, e) * (isMobile ? 1.12 : 1);
  const shift = smoothstep(0.42, 0.52, p);          // avatar drifts left after the scan
  const camX = shift * (isMobile ? 0.7 : 2.1);

  // mouse parallax
  camera.position.x = camX + (mouse.x - 0.5) * 0.5 * (1 - shift * 0.5);
  camera.position.y = camY + (mouse.y - 0.5) * 0.4;
  camera.position.z = camZ;

  lookTarget.set(0, THREE.MathUtils.lerp(2.9, 1.15, e) + shift * 0.35, 0);
  camera.lookAt(lookTarget);

  // reveal line moves head -> feet
  const revealY = THREE.MathUtils.lerp(3.0, -0.55, travel);

  // uniforms
  for (const m of holoMaterials) {
    m.uniforms.uTime.value = t;
    m.uniforms.uRevealY.value = revealY;
  }
  faceUniforms.uTime.value = t;
  faceUniforms.uRevealY.value = revealY;
  core.material.opacity = THREE.MathUtils.clamp((2.95 - revealY) * 1.2, 0, 0.9);

  // idle motion
  avatar.position.y = Math.sin(t * 0.8) * 0.045;
  avatar.rotation.y = shift * 0.32;
  ring1.rotation.z = t * 0.5;
  ring2.rotation.z = -t * 0.35;
  reticle.rotation.z = t * 0.4;
  headWire.rotation.y = t * 0.25;
  particles.rotation.y = t * 0.02;

  // sections
  for (const s of sections) {
    const o = band(p, s.in, s.out);
    s.el.style.opacity = o;
    s.el.style.transform = `translateY(${(1 - o) * 26}px)`;
    const panel = s.el.querySelector('.panel');
    if (panel) panel.style.pointerEvents = o > 0.08 ? 'auto' : 'none';
  }

  // skill bars animate once visible
  const skillO = band(p, [0.48, 0.58], [0.64, 0.72]);
  if (skillO > 0.05) {
    barFills.forEach((b) => { b.style.width = b.style.getPropertyValue('--v'); });
  }

  // HUD chips
  const heroO = band(p, [0, 0.03], [0.1, 0.15]);
  hudEl.style.opacity = heroO;
  for (const c of chipPoints) {
    v.copy(c.p).project(camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    c.el.style.transform = `translate(${x}px, ${y}px)`;
  }
  chipScan.textContent = String(Math.floor((t * 24) % 100)).padStart(2, '0');

  // scroll rail
  scrollFill.style.height = `${(p * 100).toFixed(1)}%`;

  // loader
  if (!loaderDone) {
    loaderP = Math.min(100, loaderP + dt * 75);
    loaderPct.textContent = Math.floor(loaderP) + '%';
    if (loaderP >= 100) {
      loaderDone = true;
      loader.classList.add('done');
    }
  }

  composer.render();
}

/* mouse */
const mouse = { x: 0.5, y: 0.5 };
window.addEventListener('pointermove', (ev) => {
  mouse.x = ev.clientX / window.innerWidth;
  mouse.y = ev.clientY / window.innerHeight;
});

onResize();
onScroll();
window.scrollTo(0, 0);
animate();
