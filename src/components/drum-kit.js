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
import { CATEGORIES, defaultComposition, normalizeComposition, buildPieces } from '../core/layout.js';
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

  .stage { width: 100%; height: auto; background: #1d2127; border-radius: 12px; user-select: none; }
  .piece { cursor: pointer; }
  .piece text { fill: #e8eaed; font-size: 11px; text-anchor: middle; pointer-events: none; }
  .piece.selected .head, .piece.selected .cymbal { stroke: #4da3ff; stroke-width: 3; }
`;

// Dessine une pièce (chaîne SVG) selon son type.
function renderPiece(p) {
  const r = p.d / 2;
  const labelY = p.y + r + 13;
  const cls = `piece piece-${p.type}`;

  if (p.type === 'cymbal' || p.type === 'hihat') {
    const isHat = p.type === 'hihat';
    return `
      <g class="${cls}" data-id="${p.id}">
        <circle class="cymbal" cx="${p.x}" cy="${p.y}" r="${r}"
                fill="url(#cymbalGrad)" stroke="#8a6d1f" stroke-width="1.5"/>
        <circle cx="${p.x}" cy="${p.y}" r="${r * 0.66}" fill="none" stroke="#a8842b" stroke-width="0.8"/>
        <circle cx="${p.x}" cy="${p.y}" r="${r * 0.33}" fill="none" stroke="#a8842b" stroke-width="0.8"/>
        <circle cx="${p.x}" cy="${p.y}" r="${r * 0.14}" fill="#b8902f"/>
        ${isHat ? `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="none" stroke="#cdb35a" stroke-width="1" stroke-dasharray="3 3"/>` : ''}
        <text x="${p.x}" y="${labelY}">${p.label}</text>
      </g>`;
  }

  const headFill = p.type === 'snare' ? '#fbfbf6' : '#f3ead4';
  const shell = p.type === 'snare' ? '#c7ccd1' : '#7a5a3a';
  // Gros fûts : libellé au centre (lisible) ; petits toms : libellé dessous.
  const bigDrum = p.type === 'kick' || p.type === 'snare' || p.type === 'floor';
  const txt = bigDrum
    ? `<text x="${p.x}" y="${p.y + 4}" fill="#3a3a3a">${p.label}</text>`
    : `<text x="${p.x}" y="${labelY}">${p.label}</text>`;
  return `
    <g class="${cls}" data-id="${p.id}">
      <circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${shell}"/>
      <circle class="head" cx="${p.x}" cy="${p.y}" r="${r - 3}" fill="${headFill}" stroke="#0003" stroke-width="1"/>
      ${txt}
    </g>`;
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
    this._emitChange();
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
          <defs>
            <radialGradient id="cymbalGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#e7c75a"/>
              <stop offset="70%" stop-color="#c79a2f"/>
              <stop offset="100%" stop-color="#a8842b"/>
            </radialGradient>
          </defs>
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
