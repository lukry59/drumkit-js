// Constantes de la vue de dessus.
//
// Repère : origine en haut-gauche (convention SVG). Le batteur est assis en
// BAS (y élevé) et regarde vers le HAUT. Les positions des pièces sont
// calculées dynamiquement par core/layout.js en fonction des compteurs.

export const VIEWBOX = { w: 440, h: 400 };

// Échelle d'affichage : un fût/cymbale de N pouces fait N * PX_PER_INCH px.
export const PX_PER_INCH = 5;

// Diamètre en pixels à partir d'une taille en pouces.
export function px(inches) {
  return inches * PX_PER_INCH;
}
