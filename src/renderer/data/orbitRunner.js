// Orbit Runner — a mid-level JavaScript/three.js build project.
//
// One self-contained index.html: the import map loads three.js from a CDN and
// the module is inline, so the app's live preview can render it as-is (a
// separate game.js would 404 inside the sandboxed srcDoc iframe). check.mjs is
// a tiny scaffolded helper that strips the import and compiles the module body
// with `new Function`, giving every step a real syntax gate.

const HTML_HEAD = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Orbit Runner</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; background: #05060a; }
    canvas { display: block; }
    #hud {
      position: fixed; inset: 14px 16px auto; display: flex; gap: 18px;
      font: 600 14px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #dfe6ff; letter-spacing: 0.04em; pointer-events: none;
    }
    #hud b { color: #7cf0d4; }
    #overlay {
      position: fixed; inset: 0; display: grid; place-content: center; gap: 10px;
      text-align: center; color: #eef2ff; background: rgba(5, 6, 10, 0.72);
      font: 500 16px/1.5 ui-sans-serif, system-ui, sans-serif;
      backdrop-filter: blur(3px);
    }
    #overlay[hidden] { display: none; }
    #overlay h1 { margin: 0; font-size: 30px; letter-spacing: -0.02em; }
    #overlay p { margin: 0; color: #9aa6c4; }
    kbd { padding: 2px 6px; border: 1px solid #2b3550; border-radius: 5px; font: inherit; }
  </style>
</head>
<body>
  <div id="hud">
    <span>Score <b id="score">0</b></span>
    <span>Lives <b id="lives">3</b></span>
    <span><b id="time">45</b>s</span>
  </div>

  <div id="overlay" hidden>
    <h1 id="overlay-title">Time's up</h1>
    <p>Final score <b id="final-score">0</b></p>
    <p>Press <kbd>R</kbd> to fly again</p>
  </div>

  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"
      }
    }
  </script>
  <script type="module">
`;

const HTML_TAIL = `  </script>
</body>
</html>
`;

const STAGE = `import * as THREE from 'three';

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x05060a, 18, 48);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 7, 15);
camera.lookAt(0, 1, -4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(1200 * 3);
for (let i = 0; i < starPositions.length; i += 3) {
  starPositions[i] = (Math.random() - 0.5) * 90;
  starPositions[i + 1] = Math.random() * 40 - 4;
  starPositions[i + 2] = (Math.random() - 0.5) * 90;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ color: 0x9fb4ff, size: 0.16, sizeAttenuation: true })
));

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
`;

const SHIP = `import * as THREE from 'three';

const LANE = 7;
const PLAYER_SPEED = 9;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x05060a, 18, 48);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 7, 15);
camera.lookAt(0, 1, -4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(1200 * 3);
for (let i = 0; i < starPositions.length; i += 3) {
  starPositions[i] = (Math.random() - 0.5) * 90;
  starPositions[i + 1] = Math.random() * 40 - 4;
  starPositions[i + 2] = (Math.random() - 0.5) * 90;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ color: 0x9fb4ff, size: 0.16, sizeAttenuation: true })
));

scene.add(new THREE.AmbientLight(0x8899ff, 1.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(6, 12, 8);
scene.add(keyLight);

const grid = new THREE.GridHelper(40, 40, 0x2a3f6b, 0x141d33);
grid.position.y = -0.01;
scene.add(grid);

const ship = new THREE.Mesh(
  new THREE.ConeGeometry(0.55, 1.6, 4),
  new THREE.MeshStandardMaterial({
    color: 0x7cf0d4,
    emissive: 0x1f8f7c,
    emissiveIntensity: 0.8,
    metalness: 0.4,
    roughness: 0.3,
  })
);
ship.rotation.x = Math.PI / 2;
ship.position.set(0, 0.8, 6);
scene.add(ship);

const keys = { left: false, right: false };
addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a') keys.left = true;
  if (event.key === 'ArrowRight' || event.key === 'd') keys.right = true;
});
addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a') keys.left = false;
  if (event.key === 'ArrowRight' || event.key === 'd') keys.right = false;
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  ship.position.x = Math.max(-LANE, Math.min(LANE, ship.position.x + dir * PLAYER_SPEED * dt));
  ship.rotation.z = -dir * 0.35;

  renderer.render(scene, camera);
}

animate();
`;

const ORBS = `import * as THREE from 'three';

const LANE = 7;
const PLAYER_SPEED = 9;

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x05060a, 18, 48);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 7, 15);
camera.lookAt(0, 1, -4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(1200 * 3);
for (let i = 0; i < starPositions.length; i += 3) {
  starPositions[i] = (Math.random() - 0.5) * 90;
  starPositions[i + 1] = Math.random() * 40 - 4;
  starPositions[i + 2] = (Math.random() - 0.5) * 90;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ color: 0x9fb4ff, size: 0.16, sizeAttenuation: true })
));

scene.add(new THREE.AmbientLight(0x8899ff, 1.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(6, 12, 8);
scene.add(keyLight);

const grid = new THREE.GridHelper(40, 40, 0x2a3f6b, 0x141d33);
grid.position.y = -0.01;
scene.add(grid);

const ship = new THREE.Mesh(
  new THREE.ConeGeometry(0.55, 1.6, 4),
  new THREE.MeshStandardMaterial({
    color: 0x7cf0d4,
    emissive: 0x1f8f7c,
    emissiveIntensity: 0.8,
    metalness: 0.4,
    roughness: 0.3,
  })
);
ship.rotation.x = Math.PI / 2;
ship.position.set(0, 0.8, 6);
scene.add(ship);

const keys = { left: false, right: false };
addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a') keys.left = true;
  if (event.key === 'ArrowRight' || event.key === 'd') keys.right = true;
});
addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a') keys.left = false;
  if (event.key === 'ArrowRight' || event.key === 'd') keys.right = false;
});

const orbs = [];
const rocks = [];
const orbGeometry = new THREE.SphereGeometry(0.34, 16, 16);
const orbMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd166,
  emissive: 0xffa62b,
  emissiveIntensity: 1.1,
});
const rockGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const rockMaterial = new THREE.MeshStandardMaterial({
  color: 0xff5c7a,
  emissive: 0x7a1024,
  emissiveIntensity: 0.7,
  roughness: 0.7,
});

for (let i = 0; i < 7; i += 1) {
  const orb = new THREE.Mesh(orbGeometry, orbMaterial);
  scene.add(orb);
  orbs.push(orb);
}
for (let i = 0; i < 4; i += 1) {
  const rock = new THREE.Mesh(rockGeometry, rockMaterial);
  scene.add(rock);
  rocks.push(rock);
}

function resetItem(item, spread = 0) {
  item.position.set((Math.random() - 0.5) * LANE * 2, 0.7, -35 - Math.random() * 20 - spread);
  item.userData.speed = 8 + Math.random() * 7;
}

orbs.forEach((orb, index) => resetItem(orb, index * 4));
rocks.forEach((rock, index) => resetItem(rock, index * 6));

let score = 0;
let lives = 3;
let running = true;

function paintHud() {
  scoreEl.textContent = score;
  livesEl.textContent = Math.max(lives, 0);
}

paintHud();

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (running) {
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    ship.position.x = Math.max(-LANE, Math.min(LANE, ship.position.x + dir * PLAYER_SPEED * dt));
    ship.rotation.z = -dir * 0.35;

    for (const orb of orbs) {
      orb.position.z += orb.userData.speed * dt;
      orb.rotation.y += dt * 2;
      if (orb.position.z > 9) {
        resetItem(orb);
      } else if (orb.position.distanceTo(ship.position) < 0.9) {
        score += 10;
        resetItem(orb);
        paintHud();
      }
    }

    for (const rock of rocks) {
      rock.position.z += rock.userData.speed * dt;
      rock.rotation.x += dt;
      rock.rotation.y += dt * 0.7;
      if (rock.position.z > 9) {
        resetItem(rock);
      } else if (rock.position.distanceTo(ship.position) < 0.9) {
        lives -= 1;
        resetItem(rock);
        paintHud();
        if (lives <= 0) running = false;
      }
    }
  }

  renderer.render(scene, camera);
}

animate();
`;

const FINAL = `import * as THREE from 'three';

const ROUND_SECONDS = 45;
const LANE = 7;
const PLAYER_SPEED = 9;

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const timeEl = document.getElementById('time');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const finalScoreEl = document.getElementById('final-score');

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x05060a, 18, 48);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 7, 15);
camera.lookAt(0, 1, -4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(1200 * 3);
for (let i = 0; i < starPositions.length; i += 3) {
  starPositions[i] = (Math.random() - 0.5) * 90;
  starPositions[i + 1] = Math.random() * 40 - 4;
  starPositions[i + 2] = (Math.random() - 0.5) * 90;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ color: 0x9fb4ff, size: 0.16, sizeAttenuation: true })
));

scene.add(new THREE.AmbientLight(0x8899ff, 1.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(6, 12, 8);
scene.add(keyLight);

const grid = new THREE.GridHelper(40, 40, 0x2a3f6b, 0x141d33);
grid.position.y = -0.01;
scene.add(grid);

const ship = new THREE.Mesh(
  new THREE.ConeGeometry(0.55, 1.6, 4),
  new THREE.MeshStandardMaterial({
    color: 0x7cf0d4,
    emissive: 0x1f8f7c,
    emissiveIntensity: 0.8,
    metalness: 0.4,
    roughness: 0.3,
  })
);
ship.rotation.x = Math.PI / 2;
ship.position.set(0, 0.8, 6);
scene.add(ship);

const keys = { left: false, right: false };
addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a') keys.left = true;
  if (event.key === 'ArrowRight' || event.key === 'd') keys.right = true;
  if (event.key === 'r' || event.key === 'R') resetGame();
});
addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'a') keys.left = false;
  if (event.key === 'ArrowRight' || event.key === 'd') keys.right = false;
});

const orbs = [];
const rocks = [];
const orbGeometry = new THREE.SphereGeometry(0.34, 16, 16);
const orbMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd166,
  emissive: 0xffa62b,
  emissiveIntensity: 1.1,
});
const rockGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const rockMaterial = new THREE.MeshStandardMaterial({
  color: 0xff5c7a,
  emissive: 0x7a1024,
  emissiveIntensity: 0.7,
  roughness: 0.7,
});

for (let i = 0; i < 7; i += 1) {
  const orb = new THREE.Mesh(orbGeometry, orbMaterial);
  scene.add(orb);
  orbs.push(orb);
}
for (let i = 0; i < 4; i += 1) {
  const rock = new THREE.Mesh(rockGeometry, rockMaterial);
  scene.add(rock);
  rocks.push(rock);
}

function resetItem(item, spread = 0) {
  item.position.set((Math.random() - 0.5) * LANE * 2, 0.7, -35 - Math.random() * 20 - spread);
  item.userData.speed = 8 + Math.random() * 7;
}

orbs.forEach((orb, index) => resetItem(orb, index * 4));
rocks.forEach((rock, index) => resetItem(rock, index * 6));

let score = 0;
let lives = 3;
let timeLeft = ROUND_SECONDS;
let running = true;

function paintHud() {
  scoreEl.textContent = score;
  livesEl.textContent = Math.max(lives, 0);
  timeEl.textContent = Math.max(Math.ceil(timeLeft), 0);
}

function endGame(title) {
  running = false;
  overlayTitle.textContent = title;
  finalScoreEl.textContent = score;
  overlay.hidden = false;
}

function resetGame() {
  score = 0;
  lives = 3;
  timeLeft = ROUND_SECONDS;
  running = true;
  overlay.hidden = true;
  ship.position.x = 0;
  orbs.forEach((orb, index) => resetItem(orb, index * 4));
  rocks.forEach((rock, index) => resetItem(rock, index * 6));
  paintHud();
}

paintHud();

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (running) {
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    ship.position.x = Math.max(-LANE, Math.min(LANE, ship.position.x + dir * PLAYER_SPEED * dt));
    ship.rotation.z = -dir * 0.35;

    for (const orb of orbs) {
      orb.position.z += orb.userData.speed * dt;
      orb.rotation.y += dt * 2;
      if (orb.position.z > 9) {
        resetItem(orb);
      } else if (orb.position.distanceTo(ship.position) < 0.9) {
        score += 10;
        resetItem(orb);
      }
    }

    for (const rock of rocks) {
      rock.position.z += rock.userData.speed * dt;
      rock.rotation.x += dt;
      rock.rotation.y += dt * 0.7;
      if (rock.position.z > 9) {
        resetItem(rock);
      } else if (rock.position.distanceTo(ship.position) < 0.9) {
        lives -= 1;
        resetItem(rock);
        if (lives <= 0) endGame('Ship down');
      }
    }

    timeLeft -= dt;
    if (timeLeft <= 0) endGame("Time's up");
    paintHud();
  }

  renderer.render(scene, camera);
}

animate();
`;

const CHECK_SCRIPT = `import { readFileSync } from 'node:fs';

const REQUIRED = {
  stage: [
    'new THREE.Scene',
    'new THREE.PerspectiveCamera',
    'new THREE.WebGLRenderer',
    'requestAnimationFrame',
    'renderer.render',
  ],
  ship: [
    'new THREE.AmbientLight',
    'new THREE.DirectionalLight',
    'new THREE.GridHelper',
    'new THREE.ConeGeometry',
    'keydown',
    'keyup',
    'Math.max',
  ],
  collect: [
    'new THREE.SphereGeometry',
    'new THREE.BoxGeometry',
    'distanceTo',
    'score += 10',
    'lives -= 1',
  ],
  round: [
    'ROUND_SECONDS',
    'timeLeft -= dt',
    'endGame',
    'resetGame',
    'overlay.hidden',
  ],
};

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const step = process.argv[2] || 'stage';
for (const token of REQUIRED[step] || []) {
  if (!html.includes(token)) throw new Error('missing from index.html: ' + token);
}

const open = '<script type="module">';
const start = html.indexOf(open);
const end = html.indexOf('</script>', start);
if (start === -1 || end === -1) throw new Error('index.html has no module script');

const body = html
  .slice(start + open.length, end)
  .split('\\n')
  .filter((line) => !line.trimStart().startsWith('import '))
  .join('\\n');

new Function(body);
console.log('index.html module parses');
`;

const page = (body) => HTML_HEAD + body + HTML_TAIL;

const orbitRunner = {
  id: 'orbit-runner',
  title: 'Orbit Runner',
  language: 'javascript',
  level: 'mid',
  summary: 'Build a 3D three.js arcade game: fly a ship, collect energy orbs, dodge asteroids, and beat a 45-second clock.',
  brief: 'Set up a three.js scene and renderer, light a runway, fly a ship with the keyboard, spawn and recycle collectibles, score collisions, then add a timer, lives, and restart.',
  concepts: ['three.js', 'webgl', '3d scene', 'animation loop', 'input', 'collision'],
  scaffold: [
    {
      file: 'index.html',
      content: page(`    import * as THREE from 'three';

    // TODO: build the scene, camera, and renderer, then start an animation loop.
`),
    },
    {
      file: 'check.mjs',
      content: CHECK_SCRIPT,
    },
  ],
  steps: [
    {
      id: 'orbit-1-stage',
      title: 'Set the stage',
      file: 'index.html',
      task: 'Create the `scene`, a `PerspectiveCamera` pulled back and up, and a `WebGLRenderer` that fills the window. Keep the resize handler in sync, scatter a starfield with `THREE.Points`, and start a `requestAnimationFrame` loop that renders the scene. Click the Preview panel: you should see stars, not a blank box.',
      examples: [
        { label: 'Scene and camera', code: `const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 7, 15);
camera.lookAt(0, 1, -4);` },
        { label: 'Renderer', code: `const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);` },
        { label: 'The loop', code: `function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();` },
      ],
      hints: [
        'three.js is loaded from a CDN by the import map, so keep the tab online while the preview runs.',
        'Set the pixel ratio to `Math.min(devicePixelRatio, 2)` so the game stays sharp without melting the GPU.',
        'The starfield is a BufferGeometry of 3D positions rendered with PointsMaterial.',
      ],
      checks: [
        { id: 'scene', type: 'fileContains', file: 'index.html', pattern: 'new THREE\\.Scene' },
        { id: 'camera', type: 'fileContains', file: 'index.html', pattern: 'new THREE\\.PerspectiveCamera' },
        { id: 'renderer', type: 'fileContains', file: 'index.html', pattern: 'new THREE\\.WebGLRenderer' },
        { id: 'loops', type: 'fileContains', file: 'index.html', pattern: 'requestAnimationFrame' },
        { id: 'renders', type: 'fileContains', file: 'index.html', pattern: 'renderer\\.render' },
        { id: 'parses', type: 'runCommand', command: 'node check.mjs stage', expect: 'index.html module parses', match: 'contains' },
      ],
      solution: page(STAGE),
    },
    {
      id: 'orbit-2-ship',
      title: 'Light the runway and fly',
      file: 'index.html',
      task: 'Add an ambient light and a directional key light, a `GridHelper` runway, and a cone-shaped ship near the bottom of the screen. Track the arrow keys (and A/D) with `keydown`/`keyup`, then move the ship along x inside the loop, clamping it to the lane with `Math.max`/`Math.min`. Click the preview first so it can receive key presses.',
      examples: [
        { label: 'Lights', code: `scene.add(new THREE.AmbientLight(0x8899ff, 1.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(6, 12, 8);
scene.add(keyLight);` },
        { label: 'Ship', code: `const ship = new THREE.Mesh(
  new THREE.ConeGeometry(0.55, 1.6, 4),
  new THREE.MeshStandardMaterial({ color: 0x7cf0d4, emissive: 0x1f8f7c })
);
ship.rotation.x = Math.PI / 2;
ship.position.set(0, 0.8, 6);
scene.add(ship);` },
        { label: 'Move it', code: `const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
ship.position.x = Math.max(-LANE, Math.min(LANE, ship.position.x + dir * PLAYER_SPEED * dt));` },
      ],
      hints: [
        'Use `event.key === "ArrowLeft" || event.key === "a"` so both control schemes work.',
        'A GridHelper is a ready-made grid of lines; drop it just below y=0.',
        '`clock.getDelta()` returns seconds since the last frame — multiply speeds by it so movement is frame-rate independent.',
      ],
      checks: [
        { id: 'ambient', type: 'fileContains', file: 'index.html', pattern: 'new THREE\\.AmbientLight' },
        { id: 'directional', type: 'fileContains', file: 'index.html', pattern: 'new THREE\\.DirectionalLight' },
        { id: 'grid', type: 'fileContains', file: 'index.html', pattern: 'new THREE\\.GridHelper' },
        { id: 'ship', type: 'fileContains', file: 'index.html', pattern: 'new THREE\\.ConeGeometry' },
        { id: 'keydown', type: 'fileContains', file: 'index.html', pattern: 'keydown' },
        { id: 'keyup', type: 'fileContains', file: 'index.html', pattern: 'keyup' },
        { id: 'clamps', type: 'fileContains', file: 'index.html', pattern: 'Math\\.max' },
        { id: 'parses', type: 'runCommand', command: 'node check.mjs ship', expect: 'index.html module parses', match: 'contains' },
      ],
      solution: page(SHIP),
    },
    {
      id: 'orbit-3-collect',
      title: 'Spawn orbs and score collisions',
      file: 'index.html',
      task: 'Create seven glowing orbs (`SphereGeometry`) and four asteroids (`BoxGeometry`), give each a random lane position and speed, and recycle it to the back when it passes the camera. When an orb reaches the ship, add 10 points; when a rock does, lose a life. Update the HUD through the `#score` and `#lives` elements.',
      examples: [
        { label: 'Recycle an item', code: `function resetItem(item, spread = 0) {
  item.position.set((Math.random() - 0.5) * LANE * 2, 0.7, -35 - Math.random() * 20 - spread);
  item.userData.speed = 8 + Math.random() * 7;
}` },
        { label: 'Collision', code: `if (orb.position.distanceTo(ship.position) < 0.9) {
  score += 10;
  resetItem(orb);
  paintHud();
}` },
      ],
      hints: [
        'Build the orbs and rocks once, then reuse them — never allocate a new mesh every frame.',
        '`distanceTo` compares full 3D positions; keep the ship and items at similar y values.',
        'Write the HUD from a single `paintHud()` function so score and lives never drift apart.',
      ],
      checks: [
        { id: 'orbs', type: 'fileContains', file: 'index.html', pattern: 'new THREE\\.SphereGeometry' },
        { id: 'rocks', type: 'fileContains', file: 'index.html', pattern: 'new THREE\\.BoxGeometry' },
        { id: 'distance', type: 'fileContains', file: 'index.html', pattern: 'distanceTo' },
        { id: 'scores', type: 'fileContains', file: 'index.html', pattern: 'score \\+= 10' },
        { id: 'loses-life', type: 'fileContains', file: 'index.html', pattern: 'lives -= 1' },
        { id: 'parses', type: 'runCommand', command: 'node check.mjs collect', expect: 'index.html module parses', match: 'contains' },
      ],
      solution: page(ORBS),
    },
    {
      id: 'orbit-4-round',
      title: 'Add the clock and restart',
      file: 'index.html',
      task: 'Give the run a 45-second clock, show it in `#time`, and end the game when the clock hits zero or lives run out. Reveal the `#overlay` with the reason and final score, and make R reset the score, lives, clock, ship, orbs, and rocks for another round.',
      examples: [
        { label: 'Count down', code: `timeLeft -= dt;
if (timeLeft <= 0) endGame("Time's up");
paintHud();` },
        { label: 'End and reset', code: `function endGame(title) {
  running = false;
  overlayTitle.textContent = title;
  finalScoreEl.textContent = score;
  overlay.hidden = false;
}

function resetGame() {
  score = 0;
  lives = 3;
  timeLeft = ROUND_SECONDS;
  running = true;
  overlay.hidden = true;
  paintHud();
}` },
      ],
      hints: [
        'The overlay is already in the HTML with the `hidden` attribute — flip `overlay.hidden` to show it.',
        'Keep the animation loop running after game over so the scene stays visible behind the overlay.',
        'Reset every item with `resetItem` so the next round starts from a clean field.',
      ],
      checks: [
        { id: 'round', type: 'fileContains', file: 'index.html', pattern: 'ROUND_SECONDS' },
        { id: 'counts', type: 'fileContains', file: 'index.html', pattern: 'timeLeft -= dt' },
        { id: 'ends', type: 'fileContains', file: 'index.html', pattern: 'endGame' },
        { id: 'restarts', type: 'fileContains', file: 'index.html', pattern: 'resetGame' },
        { id: 'overlay', type: 'fileContains', file: 'index.html', pattern: 'overlay\\.hidden' },
        { id: 'parses', type: 'runCommand', command: 'node check.mjs round', expect: 'index.html module parses', match: 'contains' },
      ],
      solution: page(FINAL),
    },
  ],
  reflectionPrompt: 'Why keep a fixed pool of orbs and rocks instead of creating a new mesh for every spawn?',
};

export default orbitRunner;
