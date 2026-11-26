// terrain.js - dunia Lembah Kestrel: pegunungan, sungai, jalan, pepohonan, landasan, ring, awan.
// RNG seeded (mulberry32) supaya dunia sama untuk seed yang sama.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothNoise(rng, n) {
  const vals = [];
  for (let i = 0; i < n; i++) vals.push(rng());
  return function (t) {
    const i = Math.floor(t);
    const f = t - i;
    const a = vals[Math.max(0, Math.min(n - 1, i))];
    const b = vals[Math.max(0, Math.min(n - 1, i + 1))];
    const u = f * f * (3 - 2 * f);
    return a + (b - a) * u;
  };
}

// Bangun dunia untuk satu misi. Panjang dunia ~12800 piksel.
export function buildWorld(mission) {
  const rng = mulberry32(mission.seed * 1000 + 7);
  const n1 = smoothNoise(rng, 24);
  const n2 = smoothNoise(rng, 48);
  const length = 12800;
  const baseY = 560;

  // Landasan: diratakan, posisi tersebar sepanjang dunia.
  const stripCount = mission.strips;
  const strips = [];
  for (let i = 0; i < stripCount; i++) {
    const x = 2600 + i * ((length - 3400) / Math.max(1, stripCount)) + (stripCount === 1 ? 6800 : 400);
    strips.push({
      x,
      w: 620,
      y: baseY - 8,
      name: mission.stripNames[i] || ('Landasan ' + (i + 1)),
    });
  }

  function rawHeight(x) {
    const t = x / 900;
    let h = n1(t) * 150 + n2(x / 420) * 70;
    h += Math.sin(x / 1300) * 45 + Math.sin(x / 640 + 2) * 28;
    return baseY - h;
  }

  // Ratakan terrain di sekitar tiap landasan supaya bisa mendarat,
  // plus koridor approach 2000 px di sisi kiri agar jalur turun tidak menabrak bukit.
  function heightAt(x) {
    let y = rawHeight(x);
    for (const s of strips) {
      const d = Math.abs(x - s.x);
      if (d < s.w / 2 + 260) {
        const k = Math.max(0, 1 - (d - s.w / 2) / 260);
        const kk = d <= s.w / 2 ? 1 : k * k * (3 - 2 * k);
        y = y * (1 - kk) + s.y * kk;
      }
      const approachStart = s.x - s.w / 2 - 2000;
      if (x >= approachStart && x < s.x - s.w / 2) {
        const t = (x - approachStart) / 2000;
        const blend = t * t * (3 - 2 * t) * 0.85;
        y = y * (1 - blend) + s.y * blend;
      }
    }
    return y;
  }

  // Ring bercahaya: berurutan, ketinggian bervariasi, ring pertama dekat start dan jelas terlihat.
  // Ring terakhir selalu berakhir sebelum landasan akhir supaya masih bisa mendarat.
  const rings = [];
  const ringCount = mission.rings;
  const lastStripX = strips.length ? strips[strips.length - 1].x : length - 1000;
  const ringEndX = Math.min(length - 2600, lastStripX - 800);
  for (let i = 0; i < ringCount; i++) {
    const frac = (i + 1) / (ringCount + 1);
    const x = 1100 + frac * (ringEndX - 1100);
    const y = heightAt(x) - 190 - n1(i * 1.7 + 3) * 130;
    rings.push({ x, y, r: 62, passed: false, index: i + 1 });
  }

  // Sungai: pita biru yang mengikuti lembah, di x tertentu.
  const river = { x0: 3400, x1: 5200 };
  // Jalan tanah: garis putus mengikuti terrain.
  const trees = [];
  for (let i = 0; i < 160; i++) {
    const x = 300 + rng() * (length - 600);
    const onStrip = strips.some((s) => Math.abs(x - s.x) < s.w / 2 + 30);
    if (onStrip) continue;
    trees.push({ x, y: heightAt(x), s: 0.7 + rng() * 0.7, kind: rng() < 0.6 ? 'pine' : 'round' });
  }
  // Awan: posisi tetap dari seed.
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    clouds.push({ x: rng() * length, y: 60 + rng() * 170, s: 0.7 + rng() * 1.1, v: 4 + rng() * 8 });
  }

  return { length, baseY, strips, rings, river, trees, clouds, heightAt, seed: mission.seed };
}

export function stripAt(world, x) {
  for (const s of world.strips) {
    if (Math.abs(x - s.x) <= s.w / 2 + 90) return s;
  }
  return null;
}

export function nextRing(world) {
  return world.rings.find((r) => !r.passed) || null;
}

export function nextStrip(world, deliveredCount) {
  return world.strips[deliveredCount] || null;
}
