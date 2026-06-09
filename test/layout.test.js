// Test minimal du moteur de layout (sans DOM).
import assert from 'node:assert';
import { buildPieces, defaultComposition, normalizeComposition, CATEGORIES } from '../src/core/layout.js';
import { PRESETS } from '../src/data/presets.js';

let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log('  ok -', name); };

t('composition par défaut respecte les bornes', () => {
  const c = defaultComposition();
  for (const cat of CATEGORIES) assert.ok(c[cat.key] >= cat.min && c[cat.key] <= cat.max);
});

t('normalizeComposition borne les valeurs', () => {
  const c = normalizeComposition({ kick: 99, rackTom: -5 });
  assert.equal(c.kick, 2);
  assert.equal(c.rackTom, 0);
});

t('buildPieces produit le bon nombre de pièces', () => {
  const comp = { kick: 2, snare: 1, rackTom: 3, floorTom: 2, hihat: 1, crash: 2, ride: 1 };
  const pieces = buildPieces(comp);
  const total = Object.values(comp).reduce((a, b) => a + b, 0);
  assert.equal(pieces.length, total);
});

t('chaque pièce a des coordonnées et un diamètre', () => {
  for (const p of buildPieces(defaultComposition())) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && p.d > 0, JSON.stringify(p));
  }
});

t('tous les presets se construisent sans erreur', () => {
  for (const preset of PRESETS) assert.ok(buildPieces(preset.composition).length > 0);
});

t('rackTom=0 ne produit aucun tom rack', () => {
  const pieces = buildPieces(normalizeComposition({ rackTom: 0 }));
  assert.equal(pieces.filter((p) => p.id.startsWith('rackTom')).length, 0);
});

console.log(`\n${pass} tests OK`);
