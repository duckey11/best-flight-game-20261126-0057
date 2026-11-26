// input.js - keyboard + mouse untuk Skymail Run.
// ArrowUp/Down atau W/S = pitch, ArrowLeft/Right atau A/D = throttle, Spasi = rem udara,
// P = pause, R = restart, M = mute, Enter = mulai misi.

export function createInput(onAction) {
  const keys = {};
  const input = {
    pitchUp: false, pitchDown: false,
    throttleUp: false, throttleDown: false,
    brake: false,
  };

  function sync() {
    input.pitchUp = !!(keys.ArrowUp || keys.KeyW);
    input.pitchDown = !!(keys.ArrowDown || keys.KeyS);
    input.throttleUp = !!(keys.ArrowRight || keys.KeyD);
    input.throttleDown = !!(keys.ArrowLeft || keys.KeyA);
    input.brake = !!keys.Space;
  }

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys[e.code] = true;
    sync();
    if (e.code === 'KeyP') onAction('pause');
    if (e.code === 'KeyR') onAction('restart');
    if (e.code === 'KeyM') onAction('mute');
    if (e.code === 'Enter') onAction('start');
    if (e.code === 'Space') onAction('unlock-audio');
  }
  function onKeyUp(e) {
    keys[e.code] = false;
    sync();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Mouse: klik tombol menu yang punya data-action.
  function onClick(e) {
    const el = e.target.closest ? e.target.closest('[data-action]') : null;
    if (!el) return;
    onAction(el.getAttribute('data-action'), el.getAttribute('data-mission'));
  }
  document.addEventListener('click', onClick);

  // Sentuhan pertama membuka audio (kebijakan autoplay browser).
  function unlockOnce() { onAction('unlock-audio'); }
  window.addEventListener('pointerdown', unlockOnce, { once: true });

  return input;
}
