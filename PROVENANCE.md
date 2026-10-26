# Provenance

This repository started as a copy of
[kpress_family](https://github.com/Flux-Frontiers/kpress_family)
(The Knowledge Press: The Family), which itself started as a copy of
[knowledge_press](https://github.com/Flux-Frontiers/knowledge_press)
(The Forest). The three are maintained separately: a fix made in one is
not made in the others unless someone ports it.

## Source

- Repository: `Flux-Frontiers/kpress_family`
- Commit: `22699d8` ("Merge pull request #19 from
  Flux-Frontiers/feat/home-line-marks"), kpress_family 0.1.0
- Copied: 2026-10-25, with `git archive`, so only tracked files

To see what has drifted since, diff a path against that commit, for
example:

```bash
git -C ../kpress_family diff 22699d8 -- web/src/game/familyTree.ts
```

## What was copied, and what changed in the copy

| Here | From kpress_family | Changes |
|---|---|---|
| `web/` | `web/` | package renamed `kpress-disulfide`, version 0.1.0, page title; `web/README.md` since rewritten |
| `LICENSE`, `TRADEMARK.md`, `.gitignore` | same paths | none |
| `.pre-commit-config.yaml` | same path | header comment: no Swift package |
| `.github/workflows/ci.yml` | same path | header comment |
| `.github/workflows/web.yml` | same path | header comment |
| `Makefile` | `Makefile` | header rewritten; the Swift kit targets removed; nothing that publishes |
| `CITATION.cff` | `CITATION.cff` | rewritten for The Disulfides; cites proteusPy, knowledge_press and kpress_family |

Not copied: the Swift kit (`app/`, and with it `.github/workflows/app.yml`),
`renders/`, `CHANGELOG.md`, `README.md` and `web/LAYOUT.md`. The last three
are written new for the disulfide orchard.

## What changed since the copy

The orchard reads the disulfide database (`web/src/game/classCatalog.ts`,
written by proteusPy's `proteusPy.export_web`; `make forest`). The reader
is class and bond cards (`ClassReader.tsx`, `classCards.ts`), and the HUD,
tour, album ranks and About speak of classes and bonds. Nothing user-facing
is still the Family's; the world (sky, weather, roads, cart, the Double
Helix) is shared with it and The Forest, and code comments may still name
people, lines and generations where the shared renderers kept the Family's
terms. Of the Forest's exhibits only the Double Helix was kept.

## The Spirits of Life and Innovation, from Art Techno

The statues in two exhibit glades (`web/src/game/Spirits.tsx`) are the
Spirit of Life and the Spirit of Innovation (Eureka) from
[art_techno](https://github.com/Flux-Frontiers/art_techno) ("The Gilded
Circuit"), by Eric G. Suchanek: their models `life.glb` and
`innovation-eureka.glb` in `web/public/models/` and
`web/public/models/mobile/`, their names, and their plaque text, adapted
from art_techno's `web/src/spirits.ts`. Art Techno's art is licensed
[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) (art_techno's
`LICENSE-ART`), not under this repository's Elastic License 2.0. The models are
not committed here: `make art` copies them from `ART_TECHNO_DIR` (default
`../art_techno`), and without one its glade shows only its plaque. `make
art` also writes a simplified copy of each, `web/public/models/far/`, with
art_techno's own gltf-transform; those are derived from the same models,
under the same license, and are not committed either. The Pages site
serves all of them, unaltered but for the simplified copies, under CC BY-NC
4.0 with this attribution, from the draft `web-data` release that `make
web-data-publish` writes; the site is free and non-commercial.
