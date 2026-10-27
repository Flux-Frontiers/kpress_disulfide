# The Disulfides: the web orchard

The proteusPy disulfide database drawn as an orchard you drive through in
the browser. Each binary class is a tree whose limbs run from class to finer
class, the trees of a class family stand together in a grove, and at the
hub the database tree carries every bond beside the home disulfide's
monument. [LAYOUT.md](LAYOUT.md) describes the representation in full.

## Run it

```bash
make web-install                         # once
make demos                               # the full database, through proteusPy.export_web, and make art
make web-dev                             # http://localhost:5173
```

The orchard reads databases from `public/forests/<slug>/`, written by
`proteusPy.export_web` (`make forest`), and `public/forests/index.json`
(`scripts/forests.mjs`). The exports are not committed. `?home=<key>` picks
the home disulfide, and `?tree=<id>` opens beside a binary class's tree; see
the top-level README for the order of choice.

`make web-test` runs the node tests, and `make web-build` typechecks and
builds.

## Where things are (`src/game`)

| File | What it does |
|---|---|
| `classCatalog.ts` | Types for the export, the class index, and the loaders |
| `classTree.ts` | The layout: line trees and the database tree, the class hierarchy as wood |
| `Spirits.tsx` | Art Techno's Spirits of Life and Innovation, each in her exhibit glade, from `public/models` (`make art`) |
| `classForest.ts` | Line cards, line trees as the renderer's trees, the database tree, energy colors |
| `forest.ts` | The orchard: groves by class family, the hub, roads, the tour loop, representatives |
| `molecule.ts`, `Molecules.tsx` | Ball-and-stick disulfides: representatives, foot plates, the monument |
| `classCards.ts`, `ClassReader.tsx` | The reader: class cards from the catalog, bond cards from `bonds/<key>.json` |
| `schematic.ts`, `SchematicOrchard.tsx` | Schematic mode (V): classes as cubes colored by tier, bonds as spheres colored by energy |
| `HomeMarks.tsx`, `homePath.ts` | The home disulfide on its own class tree: the wood up to it gilded, and a lantern |
| `NamePlates.tsx` | Class ids and bond keys over the nearest tree, decluttered; the "Name plates" setting (N) |
| `narration.ts`, `tourScript.ts` | What the guided tour says at each grove and on the way |
| `HUD.tsx` | Cards, search, the class list and the album |
| `growTree.ts` | Pipe-model radii, the bark sweep and the leaves |

The world itself (sky, stars, planets, weather, seasons, roads, the cart, the
guided tour, and the Double Helix exhibit) comes
from The Knowledge Press: The Forest by way of The Family; see
`../PROVENANCE.md`.

## Stack

React, three.js via React Three Fiber, Zustand and Vite. The tests run on
Node's own test runner (`scripts/test.mjs`), with no browser.
