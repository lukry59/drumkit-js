// Constantes de la vue de dessus (style "cutting file" : trait noir / fond blanc).
//
// Repère : origine en haut-gauche (convention SVG). La grosse caisse est en
// HAUT (elle pointe vers le public), le batteur / trône est en BAS. Le kit
// enveloppe le batteur. Les positions des pièces sont calculées par
// core/layout.js en fonction des compteurs.

export const VIEWBOX = { w: 480, h: 480 };

// Échelle d'affichage : un fût/cymbale de N pouces fait N * PX_PER_INCH px.
export const PX_PER_INCH = 5;

// Diamètre en pixels à partir d'une taille en pouces.
export function px(inches) {
  return inches * PX_PER_INCH;
}
