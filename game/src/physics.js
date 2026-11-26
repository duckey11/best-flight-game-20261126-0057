// physics.js - fisika terbang Skymail Run: throttle, pitch, lift, stall, fuel, damage.
// Satuan: posisi piksel dunia, kecepatan piksel/detik, sudut radian, fuel 0..100, damage 0..100.

export const STALL_SPEED = 135;
export const MAX_SPEED = 380;
export const MIN_SPEED = 60;
export const CRASH_VSPEED = 190;
export const HARD_LANDING_VSPEED = 110;

export function createPlane(x, y) {
  return {
    x, y,
    vx: 180, vy: 0,
    speed: 180,
    pitch: 0,
    throttle: 0.55,
    fuel: 100,
    damage: 0,
    onGround: false,
    landed: false,
    crashed: false,
    stalled: false,
    crashReason: '',
    softLanding: false,
    bank: 0,
  };
}

// input: { pitchUp, pitchDown, throttleUp, throttleDown, brake }
// wind: dorongan horizontal piksel/detik (negatif = dari barat, mendorong ke kiri).
export function stepPlane(p, input, dt, wind, groundYAt) {
  if (p.crashed || p.landed) return p;
  dt = Math.min(dt, 0.05);

  if (input.throttleUp) p.throttle = Math.min(1, p.throttle + dt * 0.6);
  if (input.throttleDown) p.throttle = Math.max(0, p.throttle - dt * 0.6);
  if (input.pitchUp) p.pitch = Math.max(-0.55, p.pitch - dt * 1.1);
  if (input.pitchDown) p.pitch = Math.min(0.55, p.pitch + dt * 1.1);
  // Pitch perlahan kembali netral bila tidak ada input.
  if (!input.pitchUp && !input.pitchDown) p.pitch *= (1 - dt * 0.8);

  const brake = input.brake ? 0.45 : 1;
  // Kecepatan target dari throttle; menukik menambah, menanjak mengurangi.
  let target = (110 + p.throttle * 230) * brake;
  target += Math.sin(p.pitch) * 70;
  target = Math.max(MIN_SPEED, Math.min(MAX_SPEED, target));
  p.speed += (target - p.speed) * Math.min(1, dt * 1.4);

  // Lift: butuh kecepatan minimum. Terlalu lambat = stall, pesawat jatuh.
  // p.stalled diekspos ke HUD/render supaya pemain dapat peringatan saat stall.
  const stalled = p.speed < STALL_SPEED;
  p.stalled = stalled;
  p.vx = Math.cos(p.pitch) * p.speed + (wind || 0);
  // Canvas: y membesar ke bawah, jadi pitch negatif (hidung naik) harus mengurangi y.
  let vy = Math.sin(p.pitch) * p.speed;
  if (stalled) vy += (STALL_SPEED - p.speed) * 1.6;
  p.vy = vy;
  p.bank = Math.max(-0.5, Math.min(0.5, (input.throttleUp ? 0.12 : 0) - (input.throttleDown ? 0.12 : 0) + p.pitch * 0.4));

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.x < 40) p.x = 40;

  // Bahan bakar sebanding throttle; rem udara juga membakar sedikit.
  p.fuel -= (0.35 + p.throttle * 1.05 + (input.brake ? 0.15 : 0)) * dt;
  if (p.fuel <= 0) {
    p.fuel = 0;
    p.throttle = 0;
    // Meluncur darurat: kecepatan merosot, pesawat turun.
    p.speed = Math.max(MIN_SPEED, p.speed - 60 * dt);
  }
  return p;
}

// Cek kontak dengan tanah. Mengembalikan 'landed' | 'hard' | 'crash' | null.
// strip: {x, w} landasan di bawah pesawat, atau null.
export function groundContact(p, groundY, strip) {
  if (p.crashed || p.landed) return null;
  const planeBottom = p.y + 14;
  if (planeBottom < groundY) return null;
  const vspeed = Math.abs(p.vy);
  // strip sudah dipilih stripAt (toleransi ujung landasan), jadi percayai parameternya.
  const onStrip = !!strip;
  if (onStrip) {
    if (vspeed <= HARD_LANDING_VSPEED && Math.abs(p.pitch) < 0.28 && p.speed < 260) {
      p.landed = true;
      p.onGround = true;
      p.y = groundY - 14;
      p.softLanding = vspeed <= 55 && Math.abs(p.pitch) < 0.15;
      p.vy = 0;
      return 'landed';
    }
    if (vspeed > CRASH_VSPEED || Math.abs(p.pitch) >= 0.45) {
      p.crashed = true;
      p.crashReason = 'pendaratan keras';
      p.damage = 100;
      return 'crash';
    }
    // Pendaratan kasar tapi selamat: damage, pesawat berhenti di landasan.
    p.damage = Math.min(100, p.damage + 25);
    p.landed = true;
    p.onGround = true;
    p.y = groundY - 14;
    p.vy = 0;
    return 'landed';
  }
  // Menabrak tanah atau pegunungan.
  if (vspeed > 60 || p.speed > 200) {
    p.crashed = true;
    p.crashReason = p.speed < STALL_SPEED ? 'stall' : 'tabrakan';
    p.damage = 100;
    return 'crash';
  }
  p.crashed = true;
  p.crashReason = 'tabrakan';
  p.damage = 100;
  return 'crash';
}

export function headingDegrees(p) {
  // Heading: 090 = timur (arah terbang), berubah sedikit dengan pitch/bank.
  const h = 90 + p.pitch * -28 + p.bank * 10;
  return Math.max(0, Math.min(359, Math.round(h)));
}

export function altitudeFeet(p, groundY) {
  return Math.max(0, Math.round((groundY - p.y) * 2.2));
}

export function speedKnots(p) {
  return Math.max(0, Math.round(p.speed * 0.55));
}
