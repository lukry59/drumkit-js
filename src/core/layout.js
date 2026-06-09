// Moteur d'auto-layout : transforme une "composition" (des compteurs) en une
// liste de pièces positionnées en vue de dessus.
//
// Disposition (cf. référence "cutting file") :
//   - grosse caisse EN HAUT (rectangle), batteur/trône EN BAS ;
//   - toms rack en arc juste sous la grosse caisse (vers le batteur) ;
//   - crashs en haut, charley à gauche, ride à droite ;
//   - floor tom(s) en bas, de part et d'autre du batteur ;
//   - caisse claire devant le batteur.
//
// Composition = { kick, snare, rackTom, floorTom, hihat, crash, ride }
// Sortie buildPieces() = [{ id, type, label, sizeIn, x, y, shape, ... }, ...]

import { VIEWBOX, px } from './geometry.js';

export const CATEGORIES = [
  { key: 'kick',     label: 'Grosse caisse', type: 'kick',   min: 1, max: 2, default: 1 },
  { key: 'snare',    label: 'Caisse claire', type: 'snare',  min: 1, max: 2, default: 1 },
  { key: 'rackTom',  label: 'Tom (rack)',    type: 'tom',    min: 0, max: 4, default: 2 },
  { key: 'floorTom', label: 'Floor tom',     type: 'floor',  min: 0, max: 3, default: 1 },
  { key: 'hihat',    label: 'Charleston',    type: 'hihat',  min: 0, max: 1, default: 1 },
  { key: 'crash',    label: 'Crash',         type: 'cymbal', min: 0, max: 3, default: 1 },
  { key: 'ride',     label: 'Ride',          type: 'cymbal', min: 0, max: 2, default: 1 },
];

export function defaultComposition() {
  const c = {};
  for (const cat of CATEGORIES) c[cat.key] = cat.default;
  return c;
}

export function normalizeComposition(input = {}) {
  const c = {};
  for (const cat of CATEGORIES) {
    const v = Number.isFinite(input[cat.key]) ? input[cat.key] : cat.default;
    c[cat.key] = Math.max(cat.min, Math.min(cat.max, Math.round(v)));
  }
  return c;
}

function label(base, i, total) {
  return total > 1 ? `${base} ${i + 1}` : base;
}

// Repères de mise en page (coordonnées viewBox).
const CENTER_X = 240;
const KICK_CY = 96;           // grosse caisse en haut
const KICK_DIAM = 22;         // diamètre (-> largeur du rectangle)
const KICK_DEPTH = 18;        // profondeur (-> hauteur du rectangle)

// Arc des toms rack : sous la grosse caisse, bombé vers le batteur (bas).
const TOM_ARC_CY = 150;
const TOM_ARC_R = 96;

const RACK_SIZES = [10, 12, 13, 14];
const FLOOR_SLOTS = [
  { x: 372, y: 342, sizeIn: 16 },
  { x: 434, y: 406, sizeIn: 16 },
  { x: 450, y: 286, sizeIn: 18 },
];
const CRASH_SLOTS = [
  { x: 92,  y: 168, sizeIn: 16 },
  { x: 360, y: 120, sizeIn: 18 },
  { x: 232, y: 70,  sizeIn: 17 },
];
const RIDE_SLOTS = [
  { x: 422, y: 210, sizeIn: 20 },
  { x: 300, y: 300, sizeIn: 22 },
];

export function buildPieces(composition) {
  const c = normalizeComposition(composition);
  const pieces = [];

  const addDisc = (id, type, lbl, sizeIn, x, y) =>
    pieces.push({ id, type, label: lbl, sizeIn, x, y, shape: 'disc', d: px(sizeIn) });

  // Grosse caisse — rectangle en haut ; pédale côté batteur (bas).
  // Double grosse caisse : deux fûts côte à côte.
  const kickW = px(KICK_DIAM);
  const kickH = px(KICK_DEPTH);
  const kickXs = c.kick === 1 ? [CENTER_X] : [CENTER_X - kickW / 2 - 2, CENTER_X + kickW / 2 + 2];
  kickXs.forEach((x, i) =>
    pieces.push({
      id: `kick${i + 1}`, type: 'kick', label: label('Grosse caisse', i, c.kick),
      sizeIn: KICK_DIAM, depthIn: KICK_DEPTH, x, y: KICK_CY,
      shape: 'rect', w: kickW, h: kickH,
    }));

  // Toms rack — arc régulier sous la grosse caisse (bombé vers le bas).
  const n = c.rackTom;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = ((118 - t * 56) * Math.PI) / 180; // de 118° (bas-gauche) à 62° (bas-droite)
    const x = CENTER_X + TOM_ARC_R * Math.cos(a);
    const y = TOM_ARC_CY + TOM_ARC_R * Math.sin(a);
    const sizeIn = RACK_SIZES[Math.min(i, RACK_SIZES.length - 1)];
    addDisc(`rackTom${i + 1}`, 'tom', label('Tom', i, n), sizeIn, x, y);
  }

  // Caisse claire — devant le batteur, à gauche.
  const snareSlots = [[168, 330], [120, 360]];
  for (let i = 0; i < c.snare; i++) {
    const [x, y] = snareSlots[i] || snareSlots[snareSlots.length - 1];
    addDisc(`snare${i + 1}`, 'snare', label('Caisse claire', i, c.snare), 14, x, y);
  }

  // Charleston — à gauche, près du batteur.
  for (let i = 0; i < c.hihat; i++) {
    addDisc('hihat', 'hihat', 'Charleston', 14, 80, 312);
  }

  // Floor toms — à droite du batteur.
  for (let i = 0; i < c.floorTom; i++) {
    const s = FLOOR_SLOTS[Math.min(i, FLOOR_SLOTS.length - 1)];
    addDisc(`floorTom${i + 1}`, 'floor', label('Floor tom', i, c.floorTom), s.sizeIn, s.x, s.y);
  }

  // Crashs — en haut, autour de la grosse caisse.
  for (let i = 0; i < c.crash; i++) {
    const s = CRASH_SLOTS[Math.min(i, CRASH_SLOTS.length - 1)];
    addDisc(`crash${i + 1}`, 'cymbal', label('Crash', i, c.crash), s.sizeIn, s.x, s.y);
  }

  // Rides — à droite.
  for (let i = 0; i < c.ride; i++) {
    const s = RIDE_SLOTS[Math.min(i, RIDE_SLOTS.length - 1)];
    addDisc(`ride${i + 1}`, 'cymbal', label('Ride', i, c.ride), s.sizeIn, s.x, s.y);
  }

  return pieces;
}

// Position du trône (batteur), pour la décoration statique du rendu.
export const THRONE = { x: CENTER_X, y: 446, r: 20 };

export { VIEWBOX };
