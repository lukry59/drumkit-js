// <drum-kit> — Web Component (vanilla, sans dépendance).
//
// Interface à compteurs (combien de kicks / caisses / toms / floors / cymbales)
// + visualisation live en vue de dessus (SVG). Expose la liste des éléments.
//
// Utilisation :
//   <drum-kit></drum-kit>
//   <drum-kit preset="rock-5"></drum-kit>
//   <drum-kit controls="false"></drum-kit>   <!-- preview seule -->
//
//   const el = document.querySelector('drum-kit');
//   el.getElements();                 // -> [{ id, type, label, sizeIn }, ...]
//   el.getComposition();              // -> { kick:1, snare:1, rackTom:2, ... }
//   el.setComposition({ rackTom: 3 });
//   el.setPreset('jazz-4');
//   el.addEventListener('kit-change',  (e) => console.log(e.detail.elements));
//   el.addEventListener('piece-select', (e) => console.log(e.detail.piece));

import { VIEWBOX, px } from '../core/geometry.js';
import { CATEGORIES, defaultComposition, normalizeComposition, buildPieces, THRONE } from '../core/layout.js';
import { getPreset } from '../data/presets.js';

const STYLE = `
  :host { display: block; font-family: system-ui, sans-serif; color: #e8eaed; }
  .wrap { display: grid; grid-template-columns: 220px 1fr; gap: 16px; }
  .wrap.no-controls { grid-template-columns: 1fr; }
  @media (max-width: 560px) { .wrap { grid-template-columns: 1fr; } }

  .controls { display: flex; flex-direction: column; gap: 8px; }
  .controls h3 { margin: 0 0 4px; font-size: 13px; text-transform: uppercase;
                 letter-spacing: .05em; color: #9aa0a6; }
  .row { display: flex; align-items: center; justify-content: space-between;
         background: #272b33; border-radius: 8px; padding: 6px 8px; }
  .row .name { font-size: 13px; }
  .stepper { display: flex; align-items: center; gap: 8px; }
  .stepper button {
    width: 26px; height: 26px; border: none; border-radius: 6px;
    background: #3a3f49; color: #e8eaed; font-size: 16px; cursor: pointer; line-height: 1;
  }
  .stepper button:hover:not(:disabled) { background: #4da3ff; color: #11151c; }
  .stepper button:disabled { opacity: .35; cursor: default; }
  .stepper .count { min-width: 16px; text-align: center; font-variant-numeric: tabular-nums; }

  .total { margin-top: 4px; font-size: 12px; color: #9aa0a6; }

  /* Scène style "cutting file" : trait noir sur fond blanc. */
  .stage { width: 100%; height: auto; background: #fff; border-radius: 12px;
           border: 1px solid #2c313a; user-select: none; }
  .stage .ink { fill: none; stroke: #111; }
  .piece { cursor: pointer; }
  .piece text { fill: #111; font-size: 11px; font-weight: 600; text-anchor: middle; pointer-events: none; }
  .piece .fillw { fill: #fff; stroke: #111; }
  .piece:hover .body { stroke: #e0532f; }
  .piece.selected .body { stroke: #e0532f; stroke-width: 3.5; }
`;

// --- Helpers de dessin (style line-art) -----------------------------------
const f1 = (n) => n.toFixed(1);
const polar = (cx, cy, r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

// Lugs (vis de tension) : petits cercles répartis sur le cerclage.
function lugs(cx, cy, r, count) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const [x, y] = polar(cx, cy, r, (360 / count) * i - 90);
    s += `<circle class="fillw" cx="${f1(x)}" cy="${f1(y)}" r="2.6" stroke-width="1.4"/>`;
  }
  return s;
}

// Grooves concentriques d'une cymbale.
function grooves(cx, cy, r) {
  return [0.86, 0.72, 0.58, 0.44].map((k) =>
    `<circle class="ink" cx="${cx}" cy="${cy}" r="${f1(r * k)}" stroke-width="1"/>`).join('');
}

// Lignes de brillance (un quart de cymbale).
function shine(cx, cy, r) {
  let s = '';
  for (let i = 0; i < 7; i++) {
    const d = 186 + i * 9;
    const [x1, y1] = polar(cx, cy, r * 0.52, d);
    const [x2, y2] = polar(cx, cy, r * 0.82, d);
    s += `<line class="ink" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke-width="1"/>`;
  }
  return s;
}

// Dessine une pièce (chaîne SVG) selon sa forme / son type.
function renderPiece(p) {
  const cls = `piece piece-${p.type}`;

  // Grosse caisse — rectangle vu de dessus, rail + tiges en haut, pédale en bas.
  if (p.shape === 'rect') {
    const x0 = p.x - p.w / 2, y0 = p.y - p.h / 2;
    const railY = y0 - 18;
    let rods = '';
    const nRods = 5;
    for (let i = 0; i < nRods; i++) {
      const rx = x0 + 10 + (i * (p.w - 20)) / (nRods - 1);
      rods += `<line class="ink" x1="${f1(rx)}" y1="${railY + 3}" x2="${f1(rx)}" y2="${y0}" stroke-width="2"/>`;
      rods += `<rect class="fillw" x="${f1(rx - 4)}" y="${railY - 4}" width="8" height="8" stroke-width="1.4"/>`;
    }
    // Lugs sur les bords gauche/droit.
    let sideLugs = '';
    const nSide = 4;
    for (let i = 0; i < nSide; i++) {
      const ly = y0 + 12 + (i * (p.h - 24)) / (nSide - 1);
      sideLugs += `<circle class="fillw" cx="${f1(x0)}" cy="${f1(ly)}" r="2.6" stroke-width="1.4"/>`;
      sideLugs += `<circle class="fillw" cx="${f1(x0 + p.w)}" cy="${f1(ly)}" r="2.6" stroke-width="1.4"/>`;
    }
    return `
      <g class="${cls}" data-id="${p.id}">
        <line class="ink" x1="${f1(x0 + 6)}" y1="${railY}" x2="${f1(x0 + p.w - 6)}" y2="${railY}" stroke-width="2.5"/>
        ${rods}
        <rect class="body fillw" x="${f1(x0)}" y="${f1(y0)}" width="${f1(p.w)}" height="${f1(p.h)}" rx="13" stroke-width="2.5"/>
        <rect class="ink" x="${f1(x0 + 7)}" y="${f1(y0 + 7)}" width="${f1(p.w - 14)}" height="${f1(p.h - 14)}" rx="8" stroke-width="1.2"/>
        ${sideLugs}
        <rect class="fillw" x="${f1(p.x - 6)}" y="${f1(y0 + p.h - 2)}" width="12" height="16" rx="2" stroke-width="1.6"/>
        <text x="${p.x}" y="${p.y + 4}">${p.label}</text>
      </g>`;
  }

  const r = p.d / 2;
  const labelY = p.y + r + 13;

  // Cymbales & charleston — grooves + cloche + brillance.
  if (p.type === 'cymbal' || p.type === 'hihat') {
    const stand = p.type === 'hihat'
      ? `<line class="ink" x1="${p.x}" y1="${f1(p.y + r)}" x2="${p.x}" y2="${f1(p.y + r + 12)}" stroke-width="2"/>
         <circle class="fillw" cx="${p.x}" cy="${f1(p.y + r + 14)}" r="3" stroke-width="1.4"/>`
      : '';
    return `
      <g class="${cls}" data-id="${p.id}">
        ${stand}
        <circle class="body fillw" cx="${p.x}" cy="${p.y}" r="${f1(r)}" stroke-width="2.5"/>
        ${grooves(p.x, p.y, r)}
        ${shine(p.x, p.y, r)}
        <circle class="ink" cx="${p.x}" cy="${p.y}" r="${f1(r * 0.2)}" stroke-width="1.5"/>
        <circle cx="${p.x}" cy="${p.y}" r="2.2" fill="#111"/>
        <text x="${p.x}" y="${labelY}">${p.label}</text>
      </g>`;
  }

  // Caisse claire / toms / floor — cerclage + peau + lugs.
  const lugCount = Math.max(6, Math.round(p.sizeIn * 0.6));
  const labelInside = r >= 32; // gros fûts : libellé au centre
  const txt = labelInside
    ? `<text x="${p.x}" y="${p.y + 4}">${p.label}</text>`
    : `<text x="${p.x}" y="${labelY}">${p.label}</text>`;
  return `
    <g class="${cls}" data-id="${p.id}">
      <circle class="body fillw" cx="${p.x}" cy="${p.y}" r="${f1(r)}" stroke-width="2.5"/>
      <circle class="ink" cx="${p.x}" cy="${p.y}" r="${f1(r - 6)}" stroke-width="1.4"/>
      ${lugs(p.x, p.y, r, lugCount)}
      ${txt}
    </g>`;
}

// Décor statique : trône du batteur (disque plein), repère d'orientation.
function renderThrone() {
  return `<circle cx="${THRONE.x}" cy="${THRONE.y}" r="${THRONE.r}" fill="#111"/>`;
}

class DrumKit extends HTMLElement {
  static get observedAttributes() {
    return ['preset', 'controls'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._composition = defaultComposition();
    this._selectedId = null;
  }

  connectedCallback() {
    const preset = this.getAttribute('preset');
    if (preset) {
      const p = getPreset(preset);
      if (p) this._composition = normalizeComposition(p.composition);
    }
    this._render();
    // Émission initiale différée : connectedCallback peut s'exécuter pendant
    // customElements.define(), donc avant que les écouteurs externes (démo,
    // wizard) ne soient attachés. queueMicrotask laisse ce code s'exécuter.
    queueMicrotask(() => this._emitChange());
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.shadowRoot.childElementCount) return; // pas encore monté
    if (name === 'preset' && newVal) this.setPreset(newVal);
    if (name === 'controls') this._render();
  }

  // --- API publique ---------------------------------------------------------

  getComposition() {
    return { ...this._composition };
  }

  setComposition(partial) {
    this._composition = normalizeComposition({ ...this._composition, ...partial });
    this._render();
    this._emitChange();
  }

  setPreset(id) {
    const p = getPreset(id);
    if (!p) {
      console.warn(`[drum-kit] preset inconnu : "${id}"`);
      return;
    }
    this._composition = normalizeComposition(p.composition);
    this._selectedId = null;
    this._render();
    this._emitChange();
  }

  // Sortie principale : la liste des éléments du kit.
  getElements() {
    return buildPieces(this._composition).map(({ id, type, label, sizeIn }) => ({
      id, type, label, sizeIn,
    }));
  }

  // --- Interne --------------------------------------------------------------

  _showControls() {
    return this.getAttribute('controls') !== 'false';
  }

  _emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  _emitChange() {
    this._emit('kit-change', {
      composition: this.getComposition(),
      elements: this.getElements(),
    });
  }

  _setCount(key, delta) {
    const cat = CATEGORIES.find((c) => c.key === key);
    const next = Math.max(cat.min, Math.min(cat.max, this._composition[key] + delta));
    if (next === this._composition[key]) return;
    this._composition[key] = next;
    this._render();
    this._emitChange();
  }

  _render() {
    const pieces = buildPieces(this._composition);
    const withControls = this._showControls();

    const controlsHtml = withControls ? `
      <div class="controls">
        <h3>Composition</h3>
        ${CATEGORIES.map((cat) => {
          const v = this._composition[cat.key];
          return `
            <div class="row">
              <span class="name">${cat.label}</span>
              <span class="stepper">
                <button data-act="dec" data-key="${cat.key}" ${v <= cat.min ? 'disabled' : ''} aria-label="Retirer ${cat.label}">−</button>
                <span class="count">${v}</span>
                <button data-act="inc" data-key="${cat.key}" ${v >= cat.max ? 'disabled' : ''} aria-label="Ajouter ${cat.label}">+</button>
              </span>
            </div>`;
        }).join('')}
        <div class="total">${pieces.length} élément${pieces.length > 1 ? 's' : ''}</div>
      </div>` : '';

    this.shadowRoot.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrap ${withControls ? '' : 'no-controls'}">
        ${controlsHtml}
        <svg class="stage" viewBox="0 0 ${VIEWBOX.w} ${VIEWBOX.h}" role="img" aria-label="Kit de batterie, vue de dessus">
          ${renderThrone()}
          ${pieces.map(renderPiece).join('')}
        </svg>
      </div>`;

    // Compteurs
    this.shadowRoot.querySelectorAll('.stepper button').forEach((btn) => {
      btn.addEventListener('click', () =>
        this._setCount(btn.dataset.key, btn.dataset.act === 'inc' ? 1 : -1));
    });
    // Sélection d'une pièce
    this.shadowRoot.querySelectorAll('.piece').forEach((g) => {
      if (g.dataset.id === this._selectedId) g.classList.add('selected');
      g.addEventListener('click', () => this._select(g.dataset.id));
    });
  }

  _select(id) {
    this._selectedId = id;
    this.shadowRoot.querySelectorAll('.piece').forEach((g) =>
      g.classList.toggle('selected', g.dataset.id === id));
    const piece = buildPieces(this._composition).find((p) => p.id === id);
    this._emit('piece-select', { piece });
  }
}

if (!customElements.get('drum-kit')) {
  customElements.define('drum-kit', DrumKit);
}

export { DrumKit };
