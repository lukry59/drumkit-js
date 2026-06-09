# drumkit-js

Composant Web **vanilla** (zéro dépendance) pour configurer un kit de batterie
en **vue de dessus**. On choisit *combien* de chaque élément (grosse caisse,
caisse claire, toms rack, floor toms, charley, crash, ride) via une **interface
à compteurs**, et la **visualisation SVG se met à jour en live**. Le composant
expose la **liste des éléments** du kit — prêt à alimenter un wizard.

> Pensé pour s'intégrer dans n'importe quelle app (vanilla, Angular, Svelte,
> jQuery…), puisque c'est un Custom Element natif. Pas besoin de React ni de Vue.

## Démo

```bash
npx serve .
# puis ouvrir http://localhost:3000/demo/
```

(Les modules ES nécessitent un serveur HTTP : ouvrir le fichier en `file://`
ne fonctionnera pas.)

## Utilisation

```html
<script type="module">
  import 'drumkit-js'; // enregistre <drum-kit>
</script>

<drum-kit preset="rock-5"></drum-kit>
```

```js
const kit = document.querySelector('drum-kit');

kit.getElements();        // [{ id, type, label, sizeIn }, ...]  <- sortie principale
kit.getComposition();     // { kick:1, snare:1, rackTom:2, floorTom:1, ... }
kit.setComposition({ rackTom: 3 });
kit.setPreset('jazz-4');

kit.addEventListener('kit-change', (e) => {
  console.log(e.detail.elements);   // liste à jour à chaque modification
});
kit.addEventListener('piece-select', (e) => console.log(e.detail.piece));
```

### Attributs

| Attribut   | Valeurs                | Effet                                   |
|------------|------------------------|-----------------------------------------|
| `preset`   | id d'un preset         | Pré-remplit les compteurs               |
| `controls` | `"false"`              | Masque l'UI à compteurs (preview seule) |

### Presets disponibles

`rock-5`, `jazz-4`, `fusion-5`, `metal-double`, `minimal`.

## Architecture

```
src/
  core/geometry.js   # viewBox, échelle px/pouce
  core/layout.js     # CATEGORIES + buildPieces(composition) -> pièces positionnées
  data/presets.js    # presets = compositions (compteurs)
  components/drum-kit.js  # <drum-kit> : UI compteurs + rendu SVG vue de dessus
  index.js
demo/index.html      # démo : presets + preview live + liste d'éléments
test/layout.test.js  # tests du moteur de layout (node --test maison)
```

Le **modèle de données** (composition → liste de pièces) est découplé du rendu :
`buildPieces()` est utilisable seul, sans DOM.

## Tests

```bash
npm test
```

## Pistes suivantes

- Édition au drag & drop (repositionner les éléments à la main)
- Plus de familles de cymbales (china, splash, hi-hat ouvert)
- Export du schéma (SVG/PNG) et de la composition (JSON)
