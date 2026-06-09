// Construit demo/standalone.html en inlinant les modules de src/.
// But : un fichier unique ouvrable d'un double-clic (pas de serveur, pas d'import).
//
//   node scripts/build-standalone.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Retire les lignes import/export pour pouvoir concaténer dans un seul <script>.
function strip(src) {
  return src
    .replace(/^import\s.*$/gm, '')
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '')
    .replace(/^export\s+(const|function|class|let|var)\s/gm, '$1 ')
    .trim();
}

const read = (p) => readFileSync(join(root, p), 'utf8');

// Ordre = dépendances d'abord.
const bundle = [
  read('src/core/geometry.js'),
  read('src/core/layout.js'),
  read('src/data/presets.js'),
  read('src/components/drum-kit.js'),
].map(strip).join('\n\n');

const demoWiring = `
/* ---- démo ---- */
const kit = document.getElementById('kit');
const list = document.getElementById('list');
const json = document.getElementById('json');
const presetsBar = document.getElementById('presets');
for (const p of PRESETS) {
  const b = document.createElement('button');
  b.textContent = p.name;
  b.onclick = () => kit.setPreset(p.id);
  presetsBar.appendChild(b);
}
kit.addEventListener('kit-change', (e) => {
  const els = e.detail.elements;
  list.innerHTML = els.map(el => '<li><span>' + el.label + '</span><span class="size">' + el.sizeIn + '"</span></li>').join('');
  json.textContent = JSON.stringify(els, null, 2);
});
`;

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>drum-kit — démo autonome</title>
<style>
  body { margin:0; padding:24px; background:#11151c; color:#e8eaed; font-family:system-ui,sans-serif; }
  h1 { font-size:20px; }
  .presets { display:flex; flex-wrap:wrap; gap:8px; margin:12px 0 20px; }
  .presets button { background:#272b33; color:#e8eaed; border:1px solid #3a3f49; border-radius:999px; padding:6px 14px; cursor:pointer; font-size:13px; }
  .presets button:hover { border-color:#4da3ff; }
  .layout { display:grid; grid-template-columns:1fr 280px; gap:24px; align-items:start; }
  @media (max-width:800px){ .layout { grid-template-columns:1fr; } }
  .output h2 { font-size:14px; text-transform:uppercase; letter-spacing:.05em; color:#9aa0a6; }
  .output ul { list-style:none; margin:0; padding:0; }
  .output li { display:flex; justify-content:space-between; padding:6px 10px; background:#1d2127; border-radius:6px; margin-bottom:6px; font-size:13px; }
  .output li .size { color:#9aa0a6; }
  pre { background:#1d2127; border-radius:8px; padding:12px; font-size:12px; overflow:auto; }
</style>
</head>
<body>
<h1>🥁 drum-kit — démo autonome (double-clic, aucun serveur requis)</h1>
<div class="presets" id="presets"></div>
<div class="layout">
  <drum-kit id="kit" preset="rock-5"></drum-kit>
  <div class="output">
    <h2>Éléments du kit</h2>
    <ul id="list"></ul>
    <h2>getElements()</h2>
    <pre id="json"></pre>
  </div>
</div>
<script>
${bundle}
${demoWiring}
</script>
</body>
</html>
`;

writeFileSync(join(root, 'demo/standalone.html'), html);
console.log('demo/standalone.html régénéré (' + html.length + ' octets)');
