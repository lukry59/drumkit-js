// Pré-configurations standards exprimées en compositions (compteurs).
// Servent de raccourcis : on clique un preset, ça remplit les compteurs,
// puis on ajuste librement.

export const PRESETS = [
  {
    id: 'rock-5',
    name: 'Rock 5-pièces',
    composition: { kick: 1, snare: 1, rackTom: 2, floorTom: 1, hihat: 1, crash: 1, ride: 1 },
  },
  {
    id: 'jazz-4',
    name: 'Jazz 4-pièces',
    composition: { kick: 1, snare: 1, rackTom: 1, floorTom: 1, hihat: 1, crash: 1, ride: 1 },
  },
  {
    id: 'fusion-5',
    name: 'Fusion 5-pièces',
    composition: { kick: 1, snare: 1, rackTom: 2, floorTom: 1, hihat: 1, crash: 1, ride: 1 },
  },
  {
    id: 'metal-double',
    name: 'Metal (double pédale)',
    composition: { kick: 2, snare: 1, rackTom: 2, floorTom: 2, hihat: 1, crash: 2, ride: 1 },
  },
  {
    id: 'minimal',
    name: 'Minimal (bop)',
    composition: { kick: 1, snare: 1, rackTom: 0, floorTom: 1, hihat: 1, crash: 0, ride: 1 },
  },
];

export function getPreset(id) {
  return PRESETS.find((p) => p.id === id) || null;
}
