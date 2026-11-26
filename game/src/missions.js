// missions.js - definisi 3 misi Skymail Run dan perhitungan skor.
// Dunia: Lembah Kestrel, sebuah lembah pegunungan terpencil.
// Tiap misi punya nama, deskripsi, paket bernama, ring, landasan, dan batas waktu.

export const VALLEY_NAME = 'Lembah Kestrel';

export const MISSIONS = [
  {
    id: 'dawn-mail',
    index: 0,
    name: 'Dawn Mail Run',
    subtitle: 'Fajar di Lembah Kestrel',
    description: 'Terbang melewati 5 ring cahaya, lalu mendarat mulus di Landasan Pinecrest. Paket: Surat Fajar untuk Nenek Mara.',
    packageName: 'Surat Fajar untuk Nenek Mara',
    rings: 5,
    strips: 1,
    timeLimit: 240,
    wind: 0,
    windLabel: 'Angin tenang',
    par: 150,
    seed: 11,
    stripNames: ['Landasan Pinecrest'],
    ringLabel: 'Ring',
  },
  {
    id: 'ridge-storm',
    index: 1,
    name: 'Ridge Storm',
    subtitle: 'Badai di Punggung Kestrel',
    description: '8 ring di tengah angin kencang dari barat. Panah angin terlihat di layar. Waktu ketat: 180 detik. Paket: Obat Darurat Gull Rock.',
    packageName: 'Obat Darurat Gull Rock',
    rings: 8,
    strips: 1,
    timeLimit: 180,
    wind: -55,
    windLabel: 'Angin barat kencang',
    par: 165,
    seed: 23,
    stripNames: ['Landasan Gull Rock'],
    ringLabel: 'Ring',
  },
  {
    id: 'island-hop',
    index: 2,
    name: 'Island Hop',
    subtitle: 'Tiga Landasan, Tiga Paket',
    description: 'Tanpa ring. Mendarat di 3 landasan berurutan: Pinecrest, Gull Rock, Heron Bay. Tiap pendaratan mengantar satu paket, lalu lepas landas lagi.',
    packageName: 'Tiga paket: Teh Pinecrest, Benang Gull Rock, Surat Heron Bay',
    rings: 0,
    strips: 3,
    timeLimit: 300,
    wind: 12,
    windLabel: 'Angin timur pelan',
    par: 210,
    seed: 37,
    stripNames: ['Landasan Pinecrest', 'Landasan Gull Rock', 'Landasan Heron Bay'],
    ringLabel: 'Landasan',
  },
];

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[0];
}

export function missionByIndex(i) {
  return MISSIONS[Math.max(0, Math.min(MISSIONS.length - 1, i | 0))] || MISSIONS[0];
}

// Skor: tiap ring 100, tiap pendaratan paket 250, bonus waktu, bonus landing mulus, dikurangi damage.
export function scoreResult(mission, result) {
  const rings = (result.ringsPassed || 0) * 100;
  const landings = (result.landings || 0) * 250;
  const timeLeft = Math.max(0, mission.timeLimit - (result.timeUsed || 0));
  const timeBonus = Math.round(timeLeft * 2);
  const softBonus = result.softLanding ? 150 : 0;
  const damagePenalty = Math.round(result.damage || 0);
  const total = Math.max(0, rings + landings + timeBonus + softBonus - damagePenalty);
  return { rings, landings, timeBonus, softBonus, damagePenalty, total, timeUsed: result.timeUsed || 0 };
}

export function bestScoreKey(missionId) {
  return 'skymail-best-' + missionId;
}

export function loadBest(missionId) {
  try {
    const v = Number(localStorage.getItem(bestScoreKey(missionId)));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch (e) {
    return 0;
  }
}

export function saveBest(missionId, score) {
  try {
    const prev = loadBest(missionId);
    if (score > prev) localStorage.setItem(bestScoreKey(missionId), String(score));
    return Math.max(prev, score);
  } catch (e) {
    return score;
  }
}
