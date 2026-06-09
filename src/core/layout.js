// Moteur d'auto-layout : transforme une "composition" (des compteurs) en une
// liste de pièces positionnées en vue de dessus.
//
// Composition = { kick, snare, rackTom, floorTom, hihat, crash, ride }
// Sortie buildPieces() = [{ id, type, label, sizeIn, x, y, d }, ...]

import { VIEWBOX, px } from './geometry.js';

// Catégories proposées dans l'interface (ordre d'affichage des compteurs).
//   key   : clé dans la composition
//   label : libellé UI / nom de l'élément
//   type  : famille de rendu ('kick'|'snare'|'tom'|'floor'|'hihat'|'cymbal')
//   min/max/default : bornes du compteur
export const CATEGORIES = [
  { key: 'kick',     label: 'Grosse caisse', type: 'kick',   min: 1, max: 2, default: 1 },
  { key: 'snare',    label: 'Caisse claire', type: 'snare',  min: 1, max: 2, default: 1 },
  { key: 'rackTom',  label: 'Tom (rack)',    type: 'tom',    min: 0, max: 4, default: 2 },
  { key: 'floorTom', label: 'Floor tom',     type: 'floor',  min: 0, max: 3, default: 1 },
  { key: 'hihat',    label: 'Charleston',    type: 'hihat',  min: 0, max: 1, default: 1 },
  { key: 'crash',    label: 'Crash',         type: 'cymbal', min: 0, max: 3, default: 1 },
  { key: 'ride',     label: 'Ride',          type: 'cymbal', min: 0, max: 2, default: 1 },
];

// Composition par défaut (dérivée des catégories).
export function defaultComposition() {
  const c = {};
  for (const cat of CATEGORIES) c[cat.key] = cat.default;
  return c;
}

// Borne et nettoie une composition partielle.
export function normalizeComposition(input = {}) {
  const c = {};
  for (const cat of CATEGORIES) {
    const v = Number.isFinite(input[cat.key]) ? input[cat.key] : cat.default;
    c[cat.key] = Math.max(cat.min, Math.min(cat.max, Math.round(v)));
  }
  return c;
}

// Numérote un libellé seulement s'il y a plusieurs exemplaires.
function label(base, i, total) {
  return total > 1 ? `${base} ${i + 1}` : base;
}

// Centre de référence (au-dessus duquel s'arque la rangée de toms).
const KICK_CX = 220;
const KICK_CY = 255;

// Tailles "réalistes" attribuées par index.
const RACK_SIZES = [10, 12, 13, 14];
const FLOOR_SLOTS = [
  { x: 322, y: 295, sizeIn: 16 },
  { x: 384, y: 298, sizeIn: 16 },
  { x: 392, y: 218, sizeIn: 18 },
];
const CRASH_SLOTS = [
  { x: 118, y: 118, sizeIn: 16 },
  { x: 252, y: 96,  sizeIn: 18 },
  { x: 360, y: 112, sizeIn: 17 },
];
const RIDE_SLOTS = [
  { x: 348, y: 188, sizeIn: 20 },
  { x: 200, y: 92,  sizeIn: 22 },
];

export function buildPieces(composition) {
  const c = normalizeComposition(composition);
  const pieces = [];
  const add = (id, type, lbl, sizeIn, x, y) =>
    pieces.push({ id, type, label: lbl, sizeIn, x, y, d: px(sizeIn) });

  // Grosse caisse — centrée ; en double pédale, deux fûts côte à côte.
  const kickXs = c.kick === 1 ? [KICK_CX] : [KICK_CX - 32, KICK_CX + 32];
  kickXs.forEach((x, i) =>
    add(`kick${i + 1}`, 'kick', label('Grosse caisse', i, c.kick), 22, x, KICK_CY));

  // Caisse claire — entre les jambes, légèrement à gauche.
  const snareSlots = [[152, 296], [108, 300]];
  for (let i = 0; i < c.snare; i++) {
    const [x, y] = snareSlots[i] || snareSlots[snareSlots.length - 1];
    add(`snare${i + 1}`, 'snare', label('Caisse claire', i, c.snare), 14, x, y);
  }

  // Charleston — à gauche, près du batteur.
  for (let i = 0; i < c.hihat; i++) {
    add('hihat', 'hihat', 'Charleston', 14, 88, 280);
  }

  // Toms rack — arc régulier au-dessus de la grosse caisse.
  const n = c.rackTom;
  const R = 100;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = ((-120 + t * 60) * Math.PI) / 180; // de -120° (haut-gauche) à -60°
    const x = KICK_CX + R * Math.cos(a);
    const y = KICK_CY + R * Math.sin(a);
    const sizeIn = RACK_SIZES[Math.min(i, RACK_SIZES.length - 1)];
    add(`rackTom${i + 1}`, 'tom', label('Tom', i, n), sizeIn, x, y);
  }

  // Floor toms — à droite du batteur, en éventail.
  for (let i = 0; i < c.floorTom; i++) {
    const s = FLOOR_SLOTS[Math.min(i, FLOOR_SLOTS.length - 1)];
    add(`floorTom${i + 1}`, 'floor', label('Floor tom', i, c.floorTom), s.sizeIn, s.x, s.y);
  }

  // Crashs — autour, en haut.
  for (let i = 0; i < c.crash; i++) {
    const s = CRASH_SLOTS[Math.min(i, CRASH_SLOTS.length - 1)];
    add(`crash${i + 1}`, 'cymbal', label('Crash', i, c.crash), s.sizeIn, s.x, s.y);
  }

  // Rides — à droite.
  for (let i = 0; i < c.ride; i++) {
    const s = RIDE_SLOTS[Math.min(i, RIDE_SLOTS.length - 1)];
    add(`ride${i + 1}`, 'cymbal', label('Ride', i, c.ride), s.sizeIn, s.x, s.y);
  }

  return pieces;
}

export { VIEWBOX };
