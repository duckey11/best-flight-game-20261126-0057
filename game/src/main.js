// main.js - game loop + state machine Skymail Run.
// Mode: title | playing | paused | done | crash
// Query ?shot=start|play|land|done (&seed=1) mengatur adegan deterministik untuk screenshot.

import { MISSIONS, missionById, missionByIndex, scoreResult, loadBest, saveBest } from './missions.js';
import { createPlane, stepPlane, groundContact, headingDegrees, altitudeFeet, speedKnots } from './physics.js';
import { buildWorld, stripAt, nextStrip } from './terrain.js';
import { createRenderer } from './render.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const hud = createHud();
const audio = createAudio();

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number(params.get('seed') || 1);

const state = {
  mode: 'title',
  missionIndex: 0,
  mission: MISSIONS[0],
  world: null,
  plane: null,
  cameraX: 0,
  time: 0,
  timeUsed: 0,
  score: 0,
  ringsPassed: 0,
  landings: 0,
  particles: [],
  takeoffReady: false,
  takeoffTimer: 0,
  doneResult: null,
  crashInfo: null,
  altFeet: 0,
  speedKnots: 0,
  heading: 90,
};

function resetMission(mission) {
  state.mission = mission;
  state.world = buildWorld(mission);
  const startY = state.world.heightAt(200) - 180;
  state.plane = createPlane(200, startY);
  state.cameraX = 0;
  state.timeUsed = 0;
  state.score = 0;
  state.ringsPassed = 0;
  state.landings = 0;
  state.particles = [];
  state.takeoffReady = false;
  state.takeoffTimer = 0;
  state.doneResult = null;
  state.crashInfo = null;
}

function burst(x, y, color, n) {
  for (let i = 0; i < (n || 18); i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 30 + Math.random() * 120;
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, size: 3 + Math.random() * 4, color });
  }
}

function updateParticles(dt) {
  for (const pt of state.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 60 * dt; pt.life -= dt * 1.4;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);
}

function finishMission() {
  const result = scoreResult(state.mission, {
    ringsPassed: state.ringsPassed,
    landings: state.landings,
    timeUsed: state.timeUsed,
    damage: state.plane.damage,
    softLanding: state.plane.softLanding,
  });
  state.score = result.total;
  state.doneResult = result;
  state.mode = 'done';
  const best = saveBest(state.mission.id, result.total);
  audio.land();
  hud.showDone(state.mission, result, best);
}

function crash(reason, detail) {
  if (state.mode === 'crash') return;
  state.mode = 'crash';
  state.crashInfo = { reason, detail };
  audio.crash();
  audio.setEngine(0, 0, false);
  burst(state.plane.x, state.plane.y, '#ff7a5a', 30);
  hud.showCrash(reason, detail || ('Skor ' + state.score + ' | Ring ' + state.ringsPassed + '/' + state.mission.rings));
}

function startMission(index) {
  const mission = missionByIndex(index === undefined ? state.missionIndex : index);
  state.missionIndex = mission.index;
  resetMission(mission);
  state.mode = 'playing';
  audio.unlock();
  audio.click();
  hud.showPlaying();
}

function showTitle() {
  state.mode = 'title';
  resetMission(missionByIndex(state.missionIndex));
  const bests = MISSIONS.map((m) => ({ name: m.name, score: loadBest(m.id) }));
  hud.showTitle(state.mission, bests);
}

const input = createInput((action, missionId) => {
  if (action === 'unlock-audio') { audio.unlock(); return; }
  if (action === 'mute') { hud.setMute(audio.toggleMute()); return; }
  if (action === 'start') {
    if (state.mode === 'title' || state.mode === 'done' || state.mode === 'crash') startMission();
    return;
  }
  if (action === 'pause') {
    if (state.mode === 'playing') { state.mode = 'paused'; hud.showPause(); }
    else if (state.mode === 'paused') { state.mode = 'playing'; hud.showPlaying(); }
    return;
  }
  if (action === 'restart') { startMission(); return; }
  if (action === 'play-again') { startMission(); return; }
  if (action === 'back-title') { showTitle(); return; }
  if (action === 'select-mission' && missionId) {
    const m = missionById(missionId);
    state.missionIndex = m.index;
    state.mission = m;
    resetMission(m);
    audio.click();
    const bests = MISSIONS.map((mm) => ({ name: mm.name, score: loadBest(mm.id) }));
    hud.showTitle(m, bests);
    return;
  }
});

function step(dt) {
  const p = state.plane;
  const world = state.world;
  const m = state.mission;

  // Lepas landas lagi (Island Hop): throttle penuh + pitch naik.
  if (state.takeoffReady) {
    state.takeoffTimer += dt;
    if ((input.throttleUp && input.pitchUp) || state.takeoffTimer > 6) {
      p.landed = false; p.onGround = false; p.y -= 50; p.speed = 210; p.throttle = 0.7;
      state.takeoffReady = false; state.takeoffTimer = 0;
    }
    return;
  }

  stepPlane(p, input, dt, m.wind, world.heightAt(p.x));
  state.timeUsed += dt;

  // Ring: lewat tengah ring = lolos.
  for (const r of world.rings) {
    if (r.passed) continue;
    const dx = p.x - r.x, dy = p.y - r.y;
    if (dx * dx + dy * dy < (r.r + 24) * (r.r + 24)) {
      r.passed = true;
      state.ringsPassed++;
      state.score += 100;
      audio.ring();
      burst(r.x, r.y, '#ffe066', 22);
    }
  }

  // Kontak tanah / landasan.
  const groundY = world.heightAt(p.x);
  const strip = stripAt(world, p.x);
  const contact = groundContact(p, groundY, strip);
  if (contact === 'landed') {
    const target = nextStrip(world, state.landings);
    const isTarget = target && strip && Math.abs(strip.x - target.x) < 10;
    if (m.id === 'island-hop') {
      if (isTarget) {
        state.landings++;
        state.score += 250;
        audio.land();
        burst(p.x, p.y, '#5ee6a8', 24);
        if (state.landings >= m.strips) { finishMission(); return; }
        state.takeoffReady = true; state.takeoffTimer = 0;
      } else {
        // Mendarat di landasan yang salah: boleh lepas landas lagi, tanpa paket.
        state.takeoffReady = true; state.takeoffTimer = 0;
      }
    } else {
      state.landings++;
      state.score += 250;
      finishMission();
      return;
    }
  } else if (contact === 'crash') {
    const reason = p.fuel <= 0 ? 'kehabisan fuel' : p.crashReason;
    crash(reason, 'Pesawat jatuh di Lembah Kestrel. Skor ' + state.score + '.');
    return;
  }

  if (state.timeUsed > m.timeLimit) {
    crash('waktu habis', 'Batas waktu ' + m.timeLimit + ' detik terlampaui. Skor ' + state.score + '.');
    return;
  }
  if (p.x > world.length - 200) {
    crash('keluar lembah', 'Pesawat terbang melewati ujung Lembah Kestrel.');
    return;
  }
  // Kehabisan fuel di udara: biarkan meluncur sampai jatuh, bukan crash instan.
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  state.time += dt;
  if (state.mode === 'playing') {
    step(dt);
    audio.setEngine(state.plane.throttle, state.plane.speed, true);
  } else if (state.mode === 'title') {
    // Pesawat demo melayang pelan di layar judul.
    state.plane.x += 40 * dt;
    if (state.plane.x > 2400) state.plane.x = 200;
    state.plane.y = state.world.heightAt(state.plane.x) - 180 + Math.sin(state.time) * 12;
    audio.setEngine(0.3, 120, false);
  }
  updateParticles(dt);
  state.cameraX = Math.max(0, state.plane.x - renderer.W * 0.38);
  state.altFeet = altitudeFeet(state.plane, state.world.heightAt(state.plane.x));
  state.speedKnots = speedKnots(state.plane);
  state.heading = headingDegrees(state.plane);
  hud.update(state);
  renderer.render(state);
  requestAnimationFrame(frame);
}

// Adegan deterministik untuk screenshot (?shot=...&seed=1).
function applyShot() {
  if (!shot) return;
  if (shot === 'start') {
    showTitle();
    return;
  }
  if (shot === 'play') {
    startMission(0);
    const r = state.world.rings[0];
    state.plane.x = r.x - 10; state.plane.y = r.y; state.plane.speed = 220; state.plane.throttle = 0.65;
    state.cameraX = Math.max(0, state.plane.x - renderer.W * 0.38);
    return;
  }
  if (shot === 'land') {
    startMission(0);
    const s = state.world.strips[0];
    const r = state.world.rings[0];
    r.x = s.x - 260; r.y = s.y - 210; r.passed = false;
    state.plane.x = s.x - 620; state.plane.y = s.y - 190; state.plane.speed = 200; state.plane.throttle = 0.45; state.plane.pitch = 0.08;
    state.cameraX = Math.max(0, state.plane.x - renderer.W * 0.38);
    return;
  }
  if (shot === 'done') {
    startMission(0);
    const s = state.world.strips[0];
    state.plane.x = s.x; state.plane.y = s.y - 14; state.plane.landed = true; state.plane.softLanding = true;
    state.ringsPassed = 5; state.landings = 1;
    state.world.rings.forEach((r) => { r.passed = true; });
    state.timeUsed = 132;
    const result = scoreResult(state.mission, { ringsPassed: 5, landings: 1, timeUsed: 132, damage: 0, softLanding: true });
    state.score = result.total; state.doneResult = result; state.mode = 'done';
    const best = saveBest(state.mission.id, result.total);
    hud.showDone(state.mission, result, best);
    state.cameraX = Math.max(0, state.plane.x - renderer.W * 0.38);
    return;
  }
}

// Untuk play-test otomatis: window.__skymail.
window.__skymail = state;
window.__skymailStart = startMission;

showTitle();
applyShot();
requestAnimationFrame(frame);
