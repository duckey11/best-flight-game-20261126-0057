// audio.js - suara WebAudio yang disintesis di kode: dengung mesin, bip ring, sukses, benturan.
// Tanpa file audio eksternal. Mute bisa di-toggle.

export function createAudio() {
  const a = {
    ctx: null,
    master: null,
    engineOsc: null,
    engineOsc2: null,
    engineGain: null,
    muted: false,
    started: false,
  };

  function ensure() {
    if (a.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      a.ctx = new AC();
      a.master = a.ctx.createGain();
      a.master.gain.value = a.muted ? 0 : 0.5;
      a.master.connect(a.ctx.destination);
      return true;
    } catch (e) {
      return false;
    }
  }

  a.unlock = function () {
    if (!ensure()) return;
    if (a.ctx.state === 'suspended') a.ctx.resume();
    if (a.started) return;
    a.started = true;
    try {
      a.engineOsc = a.ctx.createOscillator();
      a.engineOsc.type = 'sawtooth';
      a.engineOsc.frequency.value = 70;
      a.engineOsc2 = a.ctx.createOscillator();
      a.engineOsc2.type = 'square';
      a.engineOsc2.frequency.value = 140;
      a.engineGain = a.ctx.createGain();
      a.engineGain.gain.value = 0.0;
      const filt = a.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 420;
      a.engineOsc.connect(filt);
      a.engineOsc2.connect(filt);
      filt.connect(a.engineGain);
      a.engineGain.connect(a.master);
      a.engineOsc.start();
      a.engineOsc2.start();
    } catch (e) { /* suara opsional */ }
  };

  a.setEngine = function (throttle, speed, flying) {
    if (!a.ctx || !a.engineOsc || !a.engineGain) return;
    const t = a.ctx.currentTime;
    const freq = 55 + throttle * 95 + speed * 0.08;
    a.engineOsc.frequency.setTargetAtTime(freq, t, 0.08);
    a.engineOsc2.frequency.setTargetAtTime(freq * 2, t, 0.08);
    const g = flying ? 0.05 + throttle * 0.09 : 0.0;
    a.engineGain.gain.setTargetAtTime(a.muted ? 0 : g, t, 0.1);
  };

  a.beep = function (freq, dur, type, vol) {
    if (!ensure() || a.muted) return;
    try {
      const o = a.ctx.createOscillator();
      const g = a.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq || 880;
      g.gain.setValueAtTime(vol || 0.18, a.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.ctx.currentTime + (dur || 0.15));
      o.connect(g); g.connect(a.master);
      o.start(); o.stop(a.ctx.currentTime + (dur || 0.15));
    } catch (e) { /* abaikan */ }
  };

  a.ring = function () { a.beep(880, 0.12, 'sine', 0.22); setTimeout(() => a.beep(1318, 0.18, 'sine', 0.2), 90); };
  a.land = function () {
    a.beep(523, 0.14, 'sine', 0.22);
    setTimeout(() => a.beep(659, 0.14, 'sine', 0.22), 130);
    setTimeout(() => a.beep(784, 0.3, 'sine', 0.24), 260);
  };
  a.crash = function () {
    if (!ensure() || a.muted) return;
    try {
      const len = a.ctx.sampleRate * 0.35;
      const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = a.ctx.createBufferSource();
      src.buffer = buf;
      const g = a.ctx.createGain();
      g.gain.value = 0.4;
      src.connect(g); g.connect(a.master);
      src.start();
    } catch (e) { /* abaikan */ }
    a.beep(110, 0.4, 'sawtooth', 0.15);
  };
  a.click = function () { a.beep(660, 0.06, 'sine', 0.12); };

  a.toggleMute = function () {
    a.muted = !a.muted;
    if (a.master && a.ctx) a.master.gain.setTargetAtTime(a.muted ? 0 : 0.5, a.ctx.currentTime, 0.02);
    return a.muted;
  };

  return a;
}
