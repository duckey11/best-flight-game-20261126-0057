// hud.js - HUD + instrumen analog + overlay menu (judul, pause, selesai, crash).
// Semua teks HUD diperbarui dari state game tiap frame.

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    alt: $('hud-alt'), spd: $('hud-spd'), hdg: $('hud-hdg'),
    fuel: $('hud-fuel'), fuelBar: $('hud-fuelbar'),
    score: $('hud-score'), time: $('hud-time'), ring: $('hud-ring'),
    wind: $('hud-wind'), mission: $('hud-mission'), pkg: $('hud-package'),
    altGauge: $('gauge-alt'), spdGauge: $('gauge-spd'),
    title: $('screen-title'), pause: $('screen-pause'),
    done: $('screen-done'), crash: $('screen-crash'),
    doneTitle: $('done-title'), doneScore: $('done-score'),
    doneDetail: $('done-detail'), doneBest: $('done-best'),
    crashReason: $('crash-reason'), crashDetail: $('crash-detail'),
    bestList: $('best-list'), muteBtn: $('btn-mute'),
    titleMission: $('title-mission-name'),
  };

  function show(el, on) { if (el) el.classList.toggle('hidden', !on); }

  function drawGauge(canvas, value, max, label, color) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(10,14,28,0.72)';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); ctx.stroke();
    const frac = Math.max(0, Math.min(1, value / max));
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 12, a0, a1); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 12, a0, a0 + (a1 - a0) * frac); ctx.stroke();
    const ang = a0 + (a1 - a0) * frac;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2 + Math.cos(ang) * (w / 2 - 18), h / 2 + Math.sin(ang) * (w / 2 - 18));
    ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(label, w / 2, h - 12);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(String(Math.round(value)), w / 2, h / 2 + 16);
  }

  const hud = {
    update(state) {
      const p = state.plane;
      const m = state.mission;
      if (els.alt) els.alt.textContent = String(state.altFeet);
      if (els.spd) {
        els.spd.textContent = String(state.speedKnots);
        // SPD merah saat stall supaya bahaya terbaca tanpa melihat canvas.
        els.spd.style.color = p.stalled ? '#ff5a5a' : '';
      }
      if (els.hdg) els.hdg.textContent = String(state.heading).padStart(3, '0') + '°';
      if (els.fuel) els.fuel.textContent = Math.round(p.fuel) + '%';
      if (els.fuelBar) {
        els.fuelBar.style.width = Math.max(0, p.fuel) + '%';
        els.fuelBar.style.background = p.fuel < 20 ? '#ff5a5a' : p.fuel < 45 ? '#ffd166' : '#5ee6a8';
      }
      if (els.score) els.score.textContent = String(state.score);
      if (els.time) {
        const t = Math.max(0, m.timeLimit - state.timeUsed);
        els.time.textContent = Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
        els.time.style.color = t < 30 ? '#ff8a8a' : '#fff';
      }
      if (els.ring) {
        els.ring.textContent = m.rings > 0
          ? 'Ring ' + state.ringsPassed + '/' + m.rings
          : 'Landasan ' + state.landings + '/' + m.strips;
      }
      if (els.wind) els.wind.textContent = m.windLabel + (m.wind ? ' ' + (m.wind < 0 ? '◀' : '▶') + ' ' + Math.abs(m.wind) + ' kt' : '');
      if (els.mission) els.mission.textContent = m.name;
      if (els.pkg) els.pkg.textContent = 'Paket: ' + m.packageName;
      drawGauge(els.altGauge, state.altFeet, 3000, 'ALT ft', '#7ec8ff');
      drawGauge(els.spdGauge, state.speedKnots, 220, 'SPD kt', '#ffd166');
    },

    showTitle(mission, bests) {
      show(els.title, true); show(els.pause, false); show(els.done, false); show(els.crash, false);
      if (els.titleMission) els.titleMission.textContent = mission.name + ' — ' + mission.subtitle;
      if (els.bestList) {
        els.bestList.innerHTML = bests.map((b) => '<div>' + b.name + ': <b>' + b.score + '</b> poin</div>').join('');
      }
      document.querySelectorAll('.mission-btn').forEach((btn) => {
        btn.classList.toggle('selected', btn.getAttribute('data-mission') === mission.id);
      });
    },
    showPlaying() { show(els.title, false); show(els.pause, false); show(els.done, false); show(els.crash, false); },
    showPause() { show(els.pause, true); },
    showDone(mission, result, best) {
      show(els.done, true); show(els.pause, false);
      if (els.doneTitle) els.doneTitle.textContent = 'Misi Selesai: ' + mission.name;
      if (els.doneScore) els.doneScore.textContent = result.total + ' poin';
      if (els.doneDetail) {
        els.doneDetail.textContent = 'Ring ' + result.rings + ' + Pendaratan ' + result.landings +
          ' + Bonus waktu ' + result.timeBonus + ' + Landing mulus ' + result.softBonus +
          ' - Damage ' + result.damagePenalty + '  |  Waktu ' + Math.round(result.timeUsed) + ' dtk';
      }
      if (els.doneBest) els.doneBest.textContent = 'Skor terbaik: ' + best + ' poin';
    },
    showCrash(reason, detail) {
      show(els.crash, true); show(els.pause, false);
      if (els.crashReason) els.crashReason.textContent = 'Crash: ' + reason;
      if (els.crashDetail) els.crashDetail.textContent = detail || '';
    },
    setMute(muted) { if (els.muteBtn) els.muteBtn.textContent = muted ? 'Suara: Mati (M)' : 'Suara: Hidup (M)'; },
  };
  return hud;
}
