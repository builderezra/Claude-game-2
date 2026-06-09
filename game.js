/* ============================================================
   ZENITH — a one-touch precision tower game
   Canvas 2.5D renderer · WebAudio synth · zero dependencies
   ============================================================ */
(() => {
'use strict';

/* ---------------- Config ---------------- */
const BLOCK = 250;          // base block footprint (world units)
const BLOCK_H = 62;         // block height (world units)
const AMP = 330;            // oscillation amplitude
const BASE_SPEED = 1.85;    // rad/s of oscillation
const SPEED_RAMP = 0.024;   // per block
const SPEED_CAP = 4.4;
const PERFECT_TOL = 16;     // world units counted as a perfect drop
const EARLY_TOL = 26;       // extra forgiveness for the first few blocks
const REGROW_COMBO = 3;     // combo needed before blocks regrow
const REGROW_AMT = 16;
const ISO_X = 0.82;         // isometric projection factors
const ISO_Y = 0.46;
const UNLOCKS = [0, 15, 30, 50, 80, 120];

const THEMES = [
  { name: 'Dawn',   bg: [248, 60, 14], bg2: [318, 65, 38], hue: 16,  step: 7,  sat: 72, lit: 64, star: 'rgba(255,255,255,' },
  { name: 'Neon',   bg: [258, 80, 8],  bg2: [200, 90, 30], hue: 168, step: 11, sat: 90, lit: 58, star: 'rgba(140,255,255,' },
  { name: 'Meadow', bg: [180, 45, 12], bg2: [95, 45, 36],  hue: 78,  step: 6,  sat: 55, lit: 60, star: 'rgba(220,255,210,' },
  { name: 'Ember',  bg: [262, 55, 10], bg2: [12, 80, 38],  hue: 4,   step: 8,  sat: 82, lit: 60, star: 'rgba(255,220,180,' },
  { name: 'Mono',   bg: [230, 12, 7],  bg2: [230, 8, 26],  hue: 220, step: 0,  sat: 4,  lit: 70, star: 'rgba(255,255,255,' },
  { name: 'Aurora', bg: [240, 60, 9],  bg2: [160, 70, 28], hue: 150, step: 16, sat: 78, lit: 62, star: 'rgba(190,255,225,' },
];

/* ---------------- Persistence ---------------- */
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('zenith.' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('zenith.' + key, JSON.stringify(value)); } catch {}
  }
};

let best = store.get('best', 0);
let stats = store.get('stats', { games: 0, blocks: 0, bestStreak: 0 });
let themeIndex = store.get('theme', 0);
let soundOn = store.get('sound', true);
if (themeIndex >= THEMES.length || best < UNLOCKS[themeIndex]) themeIndex = 0;

/* ---------------- Canvas ---------------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1, U = 1, horizonY = 0;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  U = Math.min(W, 540) / 780;        // world→screen scale
  horizonY = H * 0.62;               // screen y where the tower top rests
}
window.addEventListener('resize', resize);
resize();

/* ---------------- Audio (synthesized) ---------------- */
const AudioSys = {
  ctx: null,
  master: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = soundOn ? 0.9 : 0;
    this.master.connect(this.ctx.destination);
  },
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  setEnabled(on) {
    if (this.master) this.master.gain.value = on ? 0.9 : 0;
  },
  env(gainNode, t0, peak, attack, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(peak, t0 + attack);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  },
  tone(freq, type, peak, attack, decay, detune = 0, when = 0) {
    if (!this.ctx || !soundOn) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    this.env(g, t0, peak, attack, decay);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + attack + decay + 0.05);
  },
  noise(duration, peak, filterType, filterFreq, when = 0) {
    if (!this.ctx || !soundOn) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.ceil(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    this.env(g, t0, peak, 0.005, duration);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
  },
  drop() {
    const jitter = 1 + (Math.random() - 0.5) * 0.08;
    this.tone(95 * jitter, 'triangle', 0.5, 0.005, 0.13);
    this.noise(0.07, 0.25, 'lowpass', 420);
  },
  // pentatonic ladder — pitch climbs with the combo
  perfect(combo) {
    const scale = [0, 2, 4, 7, 9];
    const step = Math.min(combo, 24);
    const semis = scale[step % 5] + 12 * Math.floor(step / 5);
    const f = 523.25 * Math.pow(2, semis / 12);
    this.tone(f, 'sine', 0.45, 0.008, 0.4);
    this.tone(f * 1.5, 'sine', 0.18, 0.008, 0.3);
    this.tone(f * 2, 'triangle', 0.08, 0.008, 0.5, 0, 0.03);
  },
  slice() {
    this.noise(0.09, 0.18, 'bandpass', 1600 + Math.random() * 500);
  },
  death() {
    this.tone(180, 'sawtooth', 0.3, 0.01, 0.5);
    if (this.ctx && soundOn) {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t0);
      osc.frequency.exponentialRampToValueAtTime(50, t0 + 0.55);
      this.env(g, t0, 0.35, 0.01, 0.55);
      osc.connect(g).connect(this.master);
      osc.start(t0);
      osc.stop(t0 + 0.7);
    }
    this.noise(0.3, 0.3, 'lowpass', 700);
  },
  fanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this.tone(f, 'sine', 0.4, 0.01, 0.45, 0, i * 0.09);
      this.tone(f * 2, 'triangle', 0.1, 0.01, 0.4, 0, i * 0.09);
    });
  },
  uiTick() {
    this.tone(880, 'sine', 0.15, 0.005, 0.08);
  }
};

function vibrate(pattern) {
  if (soundOn && navigator.vibrate) { try { navigator.vibrate(pattern); } catch {} }
}

/* ---------------- DOM refs ---------------- */
const $ = id => document.getElementById(id);
const dom = {
  hud: $('hud'), hudScore: $('hud-score'), hudCombo: $('hud-combo'),
  title: $('title'), bestChip: $('best-chip'), themes: $('themes'),
  statsLine: $('stats-line'), themeToast: $('theme-toast'),
  gameover: $('gameover'), goScore: $('go-score'), goBest: $('go-best'),
  newBest: $('new-best'), unlockNote: $('unlock-note'), goHint: $('go-hint'),
  soundBtn: $('sound-btn'),
};

/* ---------------- Game state ---------------- */
let state = 'title';          // title | playing | dying | gameover
let stack = [];               // settled blocks (index 0 = base)
let active = null;            // currently sliding block
let debris = [];              // sliced / fallen pieces
let particles = [];           // world-space particles
let rings = [];               // expanding perfect-rings
let floats = [];              // floating text
let confetti = [];            // screen-space confetti
let score = 0;
let combo = 0;
let cam = { y: 0, targetY: 0, zoom: 1, targetZoom: 1, shake: 0, shakeX: 0, shakeY: 0 };
let hitStop = 0;
let deathTimer = 0;
let restartLock = 0;
let newBestThisRun = false;
let unlockedThisRun = null;
let time = 0;
let bgHeight = 0;             // smoothed tower height driving the sky hue
let stars = [];

function theme() { return THEMES[themeIndex]; }

function makeStars() {
  stars = [];
  const n = 90;
  for (let i = 0; i < n; i++) {
    stars.push({
      x: Math.random(), y: Math.random() * 1.6,
      r: Math.random() * 1.6 + 0.4,
      tw: Math.random() * Math.PI * 2,
      depth: 0.25 + Math.random() * 0.75,
    });
  }
}
makeStars();

/* ---------------- Blocks ---------------- */
function blockColor(index) {
  const t = theme();
  const h = (t.hue + index * t.step) % 360;
  return { h, s: t.sat, l: t.lit };
}
function hsl(c, dl = 0, da = 1) {
  return `hsla(${c.h},${c.s}%,${Math.max(4, Math.min(94, c.l + dl))}%,${da})`;
}

function baseBlock() {
  return { x: 0, z: 0, wx: BLOCK, wz: BLOCK, y: 0, color: blockColor(0), squash: 0 };
}

function spawnActive() {
  const i = stack.length;                     // index of block being placed
  const axis = i % 2 === 1 ? 'x' : 'z';
  const top = stack[stack.length - 1];
  const dir = (i % 4 < 2) ? 1 : -1;           // alternate entry side
  active = {
    axis,
    x: top.x, z: top.z,
    wx: top.wx, wz: top.wz,
    y: i * BLOCK_H,
    color: blockColor(i),
    t: dir > 0 ? -Math.PI / 2 : Math.PI / 2,  // start at one extreme
    speed: Math.min(BASE_SPEED + i * SPEED_RAMP, SPEED_CAP),
    center: axis === 'x' ? top.x : top.z,
    squash: 0,
  };
}

/* ---------------- Projection ---------------- */
function project(x, z, y) {
  const zm = U * cam.zoom;
  return {
    x: W / 2 + (x - z) * ISO_X * zm + cam.shakeX,
    y: horizonY + ((x + z) * ISO_Y - (y - cam.y)) * zm + cam.shakeY,
  };
}

function drawBox(x, z, y, wx, wz, h, color, squash = 0, alpha = 1, rot = 0) {
  // squash: positive widens & flattens (landing feedback)
  const sw = 1 + squash * 0.5;
  const sh = 1 - squash * 0.55;
  const hw = (wx * sw) / 2, hd = (wz * sw) / 2;
  const yb = y, yt = y + h * sh;
  // rot only used for tumbling debris — approximate by skewing corner heights
  const tilt = rot * 28;

  const tA = project(x - hw, z - hd, yt + (rot ? -tilt : 0));
  const tB = project(x + hw, z - hd, yt + (rot ? tilt * 0.5 : 0));
  const tC = project(x + hw, z + hd, yt + (rot ? tilt : 0));
  const tD = project(x - hw, z + hd, yt + (rot ? -tilt * 0.5 : 0));
  const bB = project(x + hw, z - hd, yb + (rot ? tilt * 0.5 : 0));
  const bC = project(x + hw, z + hd, yb + (rot ? tilt : 0));
  const bD = project(x - hw, z + hd, yb + (rot ? -tilt * 0.5 : 0));

  ctx.globalAlpha = alpha;
  // +x face (right)
  ctx.fillStyle = hsl(color, -9);
  ctx.beginPath();
  ctx.moveTo(tB.x, tB.y); ctx.lineTo(tC.x, tC.y);
  ctx.lineTo(bC.x, bC.y); ctx.lineTo(bB.x, bB.y);
  ctx.closePath(); ctx.fill();
  // +z face (left)
  ctx.fillStyle = hsl(color, -17);
  ctx.beginPath();
  ctx.moveTo(tD.x, tD.y); ctx.lineTo(tC.x, tC.y);
  ctx.lineTo(bC.x, bC.y); ctx.lineTo(bD.x, bD.y);
  ctx.closePath(); ctx.fill();
  // top face
  ctx.fillStyle = hsl(color, 10);
  ctx.beginPath();
  ctx.moveTo(tA.x, tA.y); ctx.lineTo(tB.x, tB.y);
  ctx.lineTo(tC.x, tC.y); ctx.lineTo(tD.x, tD.y);
  ctx.closePath(); ctx.fill();
  // subtle top sheen
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.moveTo(tA.x, tA.y); ctx.lineTo(tB.x, tB.y);
  ctx.lineTo(tC.x, tC.y); ctx.lineTo(tD.x, tD.y);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
}

/* ---------------- Effects ---------------- */
function spawnRing(x, z, y, size) {
  rings.push({ x, z, y, size, life: 0, max: 0.55 });
}
function spawnBurst(x, z, y, color, count, power) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (0.4 + Math.random() * 0.6) * power;
    particles.push({
      x, z, y,
      vx: Math.cos(a) * sp, vz: Math.sin(a) * sp,
      vy: 120 + Math.random() * power * 0.9,
      life: 0, max: 0.5 + Math.random() * 0.45,
      r: 2 + Math.random() * 3.2,
      color: `hsla(${color.h},${color.s}%,${Math.min(92, color.l + 22)}%,`,
    });
  }
}
function spawnFloat(text, x, z, y, color) {
  floats.push({ text, x, z, y, life: 0, max: 0.9, color });
}
function spawnConfetti() {
  for (let i = 0; i < 110; i++) {
    confetti.push({
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.4,
      vx: (Math.random() - 0.5) * 60,
      vy: 140 + Math.random() * 200,
      w: 5 + Math.random() * 6,
      hgt: 8 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 9,
      hue: Math.floor(Math.random() * 360),
      life: 0, max: 3.2,
    });
  }
}

/* ---------------- Game flow ---------------- */
function startGame() {
  stack = [baseBlock()];
  debris = []; particles = []; rings = []; floats = [];
  score = 0; combo = 0;
  newBestThisRun = false; unlockedThisRun = null;
  cam.y = 0; cam.targetY = 0; cam.zoom = 1; cam.targetZoom = 1;
  bgHeight = 0;
  spawnActive();
  state = 'playing';
  setScreen('hud');
  dom.hudScore.textContent = '0';
  dom.hudCombo.classList.remove('visible');
  AudioSys.uiTick();
}

function dropBlock() {
  if (!active) return;
  const top = stack[stack.length - 1];
  const ax = active.axis;
  const pos = ax === 'x' ? active.x : active.z;
  const prevPos = ax === 'x' ? top.x : top.z;
  const size = ax === 'x' ? active.wx : active.wz;
  const delta = pos - prevPos;
  const overhang = Math.abs(delta);
  const tol = PERFECT_TOL + (stack.length < 6 ? EARLY_TOL * (1 - stack.length / 6) : 0);

  if (overhang >= size) {                     // complete miss → game over
    active.dead = true;
    debris.push({
      x: active.x, z: active.z, y: active.y,
      wx: active.wx, wz: active.wz,
      vx: ax === 'x' ? Math.sign(delta) * 80 : 0,
      vz: ax === 'z' ? Math.sign(delta) * 80 : 0,
      vy: 60, rot: 0, vr: Math.sign(delta) * 2.4,
      color: active.color, life: 0,
    });
    active = null;
    die();
    return;
  }

  let perfect = false;
  if (overhang <= tol) {
    perfect = true;
    if (ax === 'x') active.x = top.x; else active.z = top.z;
  } else {
    // slice the overhang off — kept piece is the overlap region
    const newSize = size - overhang;
    const sliceSize = overhang;
    const keepCenter = prevPos + delta / 2;
    const sliceCenter = pos + (delta > 0 ? newSize / 2 : -newSize / 2);
    if (ax === 'x') {
      active.x = keepCenter; active.wx = newSize;
      debris.push({
        x: sliceCenter, z: active.z, y: active.y,
        wx: sliceSize, wz: active.wz,
        vx: Math.sign(delta) * (60 + overhang * 0.6), vz: 0,
        vy: 30, rot: 0, vr: Math.sign(delta) * (1.6 + Math.random()),
        color: active.color, life: 0,
      });
    } else {
      active.z = keepCenter; active.wz = newSize;
      debris.push({
        x: active.x, z: sliceCenter, y: active.y,
        wx: active.wx, wz: sliceSize,
        vx: 0, vz: Math.sign(delta) * (60 + overhang * 0.6),
        vy: 30, rot: 0, vr: Math.sign(delta) * (1.6 + Math.random()),
        color: active.color, life: 0,
      });
    }
    AudioSys.slice();
    cam.shake = Math.min(7, 2 + overhang * 0.03);
  }

  // settle the block
  const settled = {
    x: active.x, z: active.z, wx: active.wx, wz: active.wz,
    y: active.y, color: active.color, squash: 0.32,
  };
  active = null;
  stack.push(settled);
  score++;
  stats.blocks++;

  if (perfect) {
    combo++;
    if (combo > stats.bestStreak) stats.bestStreak = combo;
    AudioSys.perfect(combo);
    vibrate(18);
    spawnRing(settled.x, settled.z, settled.y + BLOCK_H, Math.max(settled.wx, settled.wz));
    spawnBurst(settled.x, settled.z, settled.y + BLOCK_H, settled.color, 10 + Math.min(combo * 2, 20), 160 + combo * 14);
    if (combo >= 2) {
      dom.hudCombo.textContent = `Perfect ×${combo}`;
      dom.hudCombo.classList.add('visible');
    }
    // regrow reward — only celebrate when width is actually restored
    if (combo >= REGROW_COMBO && (settled.wx < BLOCK || settled.wz < BLOCK)) {
      settled.wx = Math.min(BLOCK, settled.wx + REGROW_AMT);
      settled.wz = Math.min(BLOCK, settled.wz + REGROW_AMT);
      spawnFloat('+GROW', settled.x, settled.z, settled.y + BLOCK_H + 30, '#9fe8ff');
    }
  } else {
    combo = 0;
    AudioSys.drop();
    vibrate(10);
    dom.hudCombo.classList.remove('visible');
  }

  dom.hudScore.textContent = score;
  dom.hudScore.classList.remove('bump');
  void dom.hudScore.offsetWidth;              // restart CSS animation
  dom.hudScore.classList.add('bump');

  cam.targetY = stack.length * BLOCK_H - BLOCK_H;
  spawnActive();
}

function die() {
  state = 'dying';
  hitStop = 0.15;
  deathTimer = 0;
  combo = 0;
  AudioSys.death();
  vibrate([30, 50, 30]);
  cam.shake = 11;
  dom.hudCombo.classList.remove('visible');

  stats.games++;
  if (score > best) {
    const oldBest = best;
    best = score;
    newBestThisRun = true;
    store.set('best', best);
    // note the highest theme threshold this run crossed for the first time
    for (let i = THEMES.length - 1; i > 0; i--) {
      if (UNLOCKS[i] > oldBest && UNLOCKS[i] <= best) { unlockedThisRun = i; break; }
    }
  }
  store.set('stats', stats);

  // zoom out to admire the tower
  const towerH = stack.length * BLOCK_H;
  const fit = (H * 0.55) / Math.max(1, towerH * U);
  cam.targetZoom = Math.max(0.18, Math.min(1, fit));
  cam.targetY = towerH * 0.5;
}

function showGameOver() {
  state = 'gameover';
  restartLock = 0.45;
  dom.goScore.textContent = score;
  dom.goBest.textContent = `Best · ${best}`;
  dom.newBest.classList.toggle('visible', newBestThisRun);
  if (unlockedThisRun !== null) {
    dom.unlockNote.textContent = `${THEMES[unlockedThisRun].name} theme unlocked`;
    dom.unlockNote.classList.add('visible');
  } else {
    dom.unlockNote.classList.remove('visible');
  }
  dom.goHint.classList.remove('visible');
  setTimeout(() => dom.goHint.classList.add('visible'), 650);
  setScreen('gameover');
  if (newBestThisRun) {
    AudioSys.fanfare();
    vibrate([20, 40, 20, 40, 40]);
    spawnConfetti();
  }
  renderThemes();
  renderStats();
}

/* ---------------- UI ---------------- */
function setScreen(name) {
  dom.hud.classList.toggle('visible', name === 'hud');
  dom.title.classList.toggle('visible', name === 'title');
  dom.gameover.classList.toggle('visible', name === 'gameover');
}

function renderThemes() {
  dom.themes.innerHTML = '';
  THEMES.forEach((t, i) => {
    const dot = document.createElement('div');
    dot.className = 'theme-dot';
    const c1 = `hsl(${t.hue},${t.sat}%,${t.lit}%)`;
    const c2 = `hsl(${(t.hue + t.step * 8) % 360},${t.sat}%,${Math.max(20, t.lit - 18)}%)`;
    dot.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
    const locked = best < UNLOCKS[i];
    if (locked) {
      dot.classList.add('locked');
      dot.dataset.unlock = UNLOCKS[i];
    }
    if (i === themeIndex) dot.classList.add('active');
    dot.addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (locked) {
        showToast(`Reach ${UNLOCKS[i]} to unlock ${t.name}`);
        vibrate(8);
        return;
      }
      themeIndex = i;
      store.set('theme', i);
      AudioSys.init(); AudioSys.resume(); AudioSys.uiTick();
      vibrate(8);
      renderThemes();
      showToast(`${t.name}`);
    });
    dom.themes.appendChild(dot);
  });
}

let toastTimer = null;
function showToast(msg) {
  dom.themeToast.textContent = msg;
  dom.themeToast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.themeToast.classList.remove('visible'), 1400);
}

function renderStats() {
  dom.bestChip.textContent = `Best · ${best}`;
  if (stats.games > 0) {
    dom.statsLine.textContent =
      `${stats.games} games · ${stats.blocks} blocks · streak ${stats.bestStreak}`;
  } else {
    dom.statsLine.textContent = '';
  }
}

function updateSoundBtn() {
  dom.soundBtn.textContent = soundOn ? '♪' : '✕';
  dom.soundBtn.style.opacity = soundOn ? 1 : 0.5;
}

dom.soundBtn.addEventListener('pointerdown', e => {
  e.stopPropagation();
  soundOn = !soundOn;
  store.set('sound', soundOn);
  AudioSys.init(); AudioSys.resume();
  AudioSys.setEnabled(soundOn);
  updateSoundBtn();
  if (soundOn) AudioSys.uiTick();
});

/* ---------------- Input ---------------- */
function onTap(e) {
  if (e.target.closest && e.target.closest('#sound-btn, .theme-dot')) return;
  AudioSys.init(); AudioSys.resume();
  if (state === 'title') {
    startGame();
  } else if (state === 'playing') {
    dropBlock();
  } else if (state === 'gameover' && restartLock <= 0) {
    startGame();
  }
}
window.addEventListener('pointerdown', onTap, { passive: true });
window.addEventListener('keydown', e => {
  if (!e.repeat && (e.code === 'Space' || e.code === 'Enter')) onTap(e);
});
// block iOS double-tap zoom & context menu
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());

/* ---------------- Update ---------------- */
function update(dt) {
  time += dt;

  if (hitStop > 0) { hitStop -= dt; return; }

  // camera easing
  cam.y += (cam.targetY - cam.y) * Math.min(1, dt * 5);
  cam.zoom += (cam.targetZoom - cam.zoom) * Math.min(1, dt * 3);
  if (cam.shake > 0) {
    cam.shake = Math.max(0, cam.shake - dt * 26);
    cam.shakeX = (Math.random() - 0.5) * cam.shake * 2;
    cam.shakeY = (Math.random() - 0.5) * cam.shake * 2;
  } else { cam.shakeX = 0; cam.shakeY = 0; }

  // sky hue follows tower height
  const targetBg = stack.length * BLOCK_H;
  bgHeight += (targetBg - bgHeight) * Math.min(1, dt * 1.5);

  // active block oscillation
  if (state === 'playing' && active) {
    active.t += active.speed * dt;
    const pos = active.center + Math.sin(active.t) * AMP;
    if (active.axis === 'x') active.x = pos; else active.z = pos;
  }

  // landing squash decay
  for (const b of stack) {
    if (b.squash > 0) b.squash = Math.max(0, b.squash - dt * 2.6);
  }

  // debris physics
  for (const d of debris) {
    d.life += dt;
    d.x += d.vx * dt; d.z += d.vz * dt;
    d.y += d.vy * dt;
    d.vy -= 1500 * dt;
    d.rot += d.vr * dt;
  }
  debris = debris.filter(d => d.life < 2.4);

  // particles
  for (const p of particles) {
    p.life += dt;
    p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
    p.vy -= 900 * dt;
  }
  particles = particles.filter(p => p.life < p.max);

  for (const r of rings) r.life += dt;
  rings = rings.filter(r => r.life < r.max);

  for (const f of floats) { f.life += dt; f.y += 70 * dt; }
  floats = floats.filter(f => f.life < f.max);

  for (const c of confetti) {
    c.life += dt;
    c.x += c.vx * dt; c.y += c.vy * dt;
    c.vy += 60 * dt;
    c.rot += c.vr * dt;
    c.vx += Math.sin(time * 3 + c.rot) * 18 * dt;
  }
  confetti = confetti.filter(c => c.life < c.max && c.y < H + 40);

  if (state === 'dying') {
    deathTimer += dt;
    if (deathTimer > 1.05) showGameOver();
  }
}

/* ---------------- Render ---------------- */
function drawBackground() {
  const t = theme();
  const shift = bgHeight * 0.022;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `hsl(${(t.bg[0] + shift) % 360},${t.bg[1]}%,${t.bg[2]}%)`);
  g.addColorStop(1, `hsl(${(t.bg2[0] + shift * 0.6) % 360},${t.bg2[1]}%,${t.bg2[2]}%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // parallax stars
  const drift = cam.y * U * 0.12;
  for (const s of stars) {
    const sy = ((s.y * H + drift * s.depth) % (H * 1.6) + H * 1.6) % (H * 1.6) - H * 0.3;
    const twinkle = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.4 + s.tw));
    ctx.fillStyle = t.star + (twinkle * s.depth) + ')';
    ctx.beginPath();
    ctx.arc(s.x * W, sy, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // soft vignette
  const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.55, H * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function render() {
  drawBackground();

  // ground shadow under tower
  const base = project(0, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(base.x, base.y + 8 * cam.zoom, BLOCK * ISO_X * U * cam.zoom * 1.15, BLOCK * ISO_Y * U * cam.zoom * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // draw settled blocks bottom-up, culling blocks scrolled below the screen
  const cullMargin = BLOCK_H * U * cam.zoom * 3 + 120;
  for (const b of stack) {
    if (project(b.x, b.z, b.y + BLOCK_H).y > H + cullMargin) continue;
    drawBox(b.x, b.z, b.y, b.wx, b.wz, BLOCK_H, b.color, b.squash);
  }

  // debris (sliced pieces)
  for (const d of debris) {
    const alpha = Math.max(0, 1 - d.life / 2.2);
    drawBox(d.x, d.z, d.y, d.wx, d.wz, BLOCK_H, d.color, 0, alpha, d.rot);
  }

  // active sliding block
  if (active) {
    drawBox(active.x, active.z, active.y, active.wx, active.wz, BLOCK_H, active.color, 0);
  }

  // perfect rings (expanding outline on the top face)
  for (const r of rings) {
    const k = r.life / r.max;
    const grow = 1 + k * 0.7;
    const hw = (r.size * grow) / 2, hd = (r.size * grow) / 2;
    const a = project(r.x - hw, r.z - hd, r.y);
    const b = project(r.x + hw, r.z - hd, r.y);
    const c = project(r.x + hw, r.z + hd, r.y);
    const d = project(r.x - hw, r.z + hd, r.y);
    ctx.strokeStyle = `rgba(255,255,255,${0.85 * (1 - k)})`;
    ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath(); ctx.stroke();
  }

  // particles
  for (const p of particles) {
    const k = p.life / p.max;
    const pos = project(p.x, p.z, p.y);
    ctx.fillStyle = p.color + (1 - k) + ')';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, p.r * (1 - k * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }

  // floating text
  for (const f of floats) {
    const k = f.life / f.max;
    const pos = project(f.x, f.z, f.y);
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = f.color;
    ctx.font = `700 ${Math.round(15 * (1 + k * 0.2))}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(f.text, pos.x, pos.y);
    ctx.globalAlpha = 1;
  }

  // confetti (screen space)
  for (const c of confetti) {
    const k = c.life / c.max;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.globalAlpha = Math.min(1, 3 * (1 - k));
    ctx.fillStyle = `hsl(${c.hue},85%,62%)`;
    ctx.fillRect(-c.w / 2, -c.hgt / 2, c.w, c.hgt);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/* ---------------- Main loop ---------------- */
let last = performance.now();
function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;                     // tab-switch guard
  if (restartLock > 0) restartLock -= dt;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

/* ---------------- Debug hook (?debug) ---------------- */
if (location.search.includes('debug')) {
  window.__zenith = {
    state: () => ({
      state, score, combo, best,
      stackLen: stack.length,
      topW: stack.length ? Math.round(Math.min(stack[stack.length - 1].wx, stack[stack.length - 1].wz)) : 0,
    }),
    start: () => { if (state === 'title' || state === 'gameover') { restartLock = 0; startGame(); } },
    perfectDrop: () => {
      if (state !== 'playing' || !active) return false;
      const top = stack[stack.length - 1];
      if (active.axis === 'x') active.x = top.x; else active.z = top.z;
      dropBlock();
      return true;
    },
    sliceDrop: (off) => {
      if (state !== 'playing' || !active) return false;
      const top = stack[stack.length - 1];
      if (active.axis === 'x') active.x = top.x + off; else active.z = top.z + off;
      dropBlock();
      return true;
    },
    forceMiss: () => {
      if (state !== 'playing' || !active) return false;
      const top = stack[stack.length - 1];
      const off = Math.max(active.wx, active.wz) + 60;
      if (active.axis === 'x') active.x = top.x + off; else active.z = top.z + off;
      dropBlock();
      return true;
    },
  };
}

/* ---------------- Boot ---------------- */
function boot() {
  stack = [baseBlock()];
  cam.targetY = 0;
  renderThemes();
  renderStats();
  updateSoundBtn();
  setScreen('title');
  requestAnimationFrame(loop);
}
boot();

// register service worker for offline play
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

})();
