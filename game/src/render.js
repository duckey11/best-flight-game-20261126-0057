// render.js - menggambar pesawat, terrain, langit senja, awan, ring, landasan, partikel.
// Semua grafis Canvas 2D (bentuk, gradasi, poligon), tanpa gambar eksternal.

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  function drawSky(camX, time) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2b2a6b');
    g.addColorStop(0.45, '#8a4d8f');
    g.addColorStop(0.75, '#ff8c5a');
    g.addColorStop(1, '#ffc46b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Matahari rendah.
    const sx = W - 180, sy = 190;
    const sg = ctx.createRadialGradient(sx, sy, 8, sx, sy, 110);
    sg.addColorStop(0, 'rgba(255,236,170,0.95)');
    sg.addColorStop(0.4, 'rgba(255,180,90,0.55)');
    sg.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx - 120, sy - 120, 240, 240);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(sx, sy, 34, 0, Math.PI * 2); ctx.fill();
    // Bintang awal di langit atas.
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 24; i++) {
      const bx = (i * 173 + 41) % W, by = (i * 97 + 13) % 120;
      ctx.fillRect(bx, by, 2, 2);
    }
  }

  function drawClouds(world, camX) {
    ctx.fillStyle = 'rgba(255,220,200,0.85)';
    for (const c of world.clouds) {
      let x = (c.x - camX * 0.35) % (world.length + 400);
      if (x < -200) x += world.length + 400;
      const y = c.y;
      const s = c.s;
      ctx.beginPath();
      ctx.ellipse(x, y, 70 * s, 20 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 40 * s, y + 6 * s, 48 * s, 16 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 42 * s, y + 7 * s, 44 * s, 15 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTerrain(world, camX) {
    const startX = Math.max(0, camX - 80);
    const endX = Math.min(world.length, camX + W + 80);
    // Lapisan pegunungan jauh (siluet ungu).
    ctx.fillStyle = '#5b4a8a';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = startX; x <= endX; x += 40) {
      const sx = x - camX;
      const y = 330 + Math.sin(x / 700) * 55 + Math.sin(x / 310 + 1) * 26;
      ctx.lineTo(sx, y);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // Bukit tengah (hijau gelap).
    ctx.fillStyle = '#3f6b4a';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = startX; x <= endX; x += 30) {
      const sx = x - camX;
      ctx.lineTo(sx, world.heightAt(x) - 90 + Math.sin(x / 500) * 18);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // Tanah utama.
    const g = ctx.createLinearGradient(0, 300, 0, H);
    g.addColorStop(0, '#5d8a4a');
    g.addColorStop(1, '#2f4d2a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = startX; x <= endX; x += 16) {
      ctx.lineTo(x - camX, world.heightAt(x));
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // Sungai.
    ctx.fillStyle = '#5db8d6';
    ctx.beginPath();
    const r0 = world.river.x0, r1 = world.river.x1;
    ctx.moveTo(r0 - camX, world.heightAt(r0));
    for (let x = r0; x <= r1; x += 20) ctx.lineTo(x - camX, world.heightAt(x) + 6);
    for (let x = r1; x >= r0; x -= 20) ctx.lineTo(x - camX, world.heightAt(x) + 26);
    ctx.closePath(); ctx.fill();
    // Jalan tanah.
    ctx.strokeStyle = '#b89a6a'; ctx.lineWidth = 7; ctx.setLineDash([16, 12]);
    ctx.beginPath();
    for (let x = startX; x <= endX; x += 30) {
      const y = world.heightAt(x) - 42;
      if (x === startX) ctx.moveTo(x - camX, y); else ctx.lineTo(x - camX, y);
    }
    ctx.stroke(); ctx.setLineDash([]);
    // Pepohonan.
    for (const t of world.trees) {
      const sx = t.x - camX;
      if (sx < -40 || sx > W + 40) continue;
      if (t.kind === 'pine') {
        ctx.fillStyle = '#1e4d2b';
        ctx.beginPath();
        ctx.moveTo(sx, t.y - 34 * t.s);
        ctx.lineTo(sx - 11 * t.s, t.y - 4 * t.s);
        ctx.lineTo(sx + 11 * t.s, t.y - 4 * t.s);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4a3220';
        ctx.fillRect(sx - 2, t.y - 6 * t.s, 4, 7 * t.s);
      } else {
        ctx.fillStyle = '#2c6b34';
        ctx.beginPath(); ctx.arc(sx, t.y - 14 * t.s, 11 * t.s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a3220';
        ctx.fillRect(sx - 2, t.y - 8 * t.s, 4, 9 * t.s);
      }
    }
    // Landasan pacu.
    for (const s of world.strips) {
      const sx = s.x - camX;
      if (sx < -s.w || sx > W + s.w) continue;
      ctx.fillStyle = '#3a3f4a';
      ctx.fillRect(sx - s.w / 2, s.y - 4, s.w, 10);
      ctx.fillStyle = '#ffd166';
      for (let i = -2; i <= 2; i++) ctx.fillRect(sx + i * 110 - 18, s.y - 2, 36, 4);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(s.name, sx, s.y - 16);
      // Rambu angin kecil di ujung landasan.
      ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sx + s.w / 2 - 20, s.y - 4); ctx.lineTo(sx + s.w / 2 - 20, s.y - 42); ctx.stroke();
      ctx.fillStyle = '#ff7a5a';
      ctx.beginPath(); ctx.moveTo(sx + s.w / 2 - 20, s.y - 42); ctx.lineTo(sx + s.w / 2 + 6, s.y - 36); ctx.lineTo(sx + s.w / 2 - 20, s.y - 30); ctx.closePath(); ctx.fill();
    }
  }

  function drawRings(world, camX, time) {
    for (const r of world.rings) {
      const sx = r.x - camX;
      if (sx < -120 || sx > W + 120) continue;
      const pulse = 1 + Math.sin(time * 3 + r.index) * 0.05;
      const rad = r.r * pulse;
      ctx.save();
      ctx.globalAlpha = r.passed ? 0.25 : 1;
      ctx.strokeStyle = r.passed ? '#9be8c0' : '#ffe066';
      ctx.lineWidth = 9;
      ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(sx, r.y, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sx, r.y, rad - 8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(r.index), sx, r.y - rad - 12);
      ctx.restore();
    }
  }

  function drawPlane(p, camX) {
    const sx = p.x - camX, sy = p.y;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(p.pitch + p.bank * 0.3);
    // Baling-baling berputar.
    const propA = (Date.now() / 1000) * (6 + p.throttle * 30);
    ctx.strokeStyle = 'rgba(40,40,50,0.75)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(propA) * 6, Math.sin(propA) * 6);
    ctx.lineTo(Math.cos(propA) * 26, Math.sin(propA) * 26);
    ctx.moveTo(-Math.cos(propA) * 6, -Math.sin(propA) * 6);
    ctx.lineTo(-Math.cos(propA) * 26, -Math.sin(propA) * 26);
    ctx.stroke();
    // Badan pesawat: kuning kurir pos dengan garis merah.
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.moveTo(34, 0); ctx.lineTo(10, -9); ctx.lineTo(-26, -8); ctx.lineTo(-32, 0); ctx.lineTo(-26, 7); ctx.lineTo(8, 8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d94f3d';
    ctx.fillRect(-24, -6, 30, 3);
    // Kokpit.
    ctx.fillStyle = '#bfe8ff';
    ctx.beginPath(); ctx.arc(8, -7, 7, 0, Math.PI * 2); ctx.fill();
    // Sayap.
    ctx.fillStyle = '#e8a13c';
    ctx.fillRect(-6, -4, 16, 22);
    ctx.fillStyle = '#d94f3d';
    ctx.fillRect(-6, 16, 16, 3);
    // Ekor.
    ctx.fillStyle = '#d94f3d';
    ctx.beginPath(); ctx.moveTo(-26, -8); ctx.lineTo(-36, -18); ctx.lineTo(-30, -6); ctx.closePath(); ctx.fill();
    // Paket di bawah badan.
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(-4, 8, 14, 9);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.strokeRect(-4, 8, 14, 9);
    ctx.restore();
  }

  function drawWind(mission, camX, time) {
    if (!mission.wind) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'left';
    const dir = mission.wind < 0 ? '◀' : '▶';
    ctx.fillText('ANGIN ' + dir + ' ' + Math.abs(mission.wind) + ' kt', 16, 130);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const x = 16 + ((time * 60 + i * 90) % 360);
      const y = 150 + i * 0;
      ctx.beginPath();
      ctx.moveTo(x, 152);
      ctx.lineTo(x + (mission.wind < 0 ? -34 : 34), 152);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles(particles, camX) {
    for (const pt of particles) {
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x - camX, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function render(state) {
    const camX = state.cameraX;
    drawSky(camX, state.time);
    drawClouds(state.world, camX);
    drawTerrain(state.world, camX);
    drawRings(state.world, camX, state.time);
    drawParticles(state.particles, camX);
    drawPlane(state.plane, camX);
    drawWind(state.mission, camX, state.time);
    // Penanda ring berikutnya: panah kecil di atas pesawat.
    const nr = state.world.rings.find((r) => !r.passed);
    if (nr && state.mode === 'playing') {
      const sx = nr.x - camX;
      if (sx > W - 60) {
        ctx.fillStyle = '#ffe066'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('RING ' + nr.index + ' ▶', W - 16, 96);
      }
    }
  }

  return { render, W, H };
}
