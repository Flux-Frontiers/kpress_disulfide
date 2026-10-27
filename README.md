[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/Flux-Frontiers/kpress_disulfide/releases)
[![License: Elastic-2.0](https://img.shields.io/badge/License-Elastic%202.0-blue.svg)](https://www.elastic.co/licensing/elastic-license)
[![Node](https://img.shields.io/badge/node-22-blue.svg)](https://nodejs.org/)
[![Data: proteusPy](https://img.shields.io/badge/data-proteusPy-blue.svg)](https://github.com/suchanek/proteusPy)
[![Disulfides](https://img.shields.io/badge/disulfides-158%2C965-blue.svg)](https://github.com/suchanek/proteusPy)
[![CI](https://github.com/Flux-Frontiers/kpress_disulfide/actions/workflows/ci.yml/badge.svg)](https://github.com/Flux-Frontiers/kpress_disulfide/actions/workflows/ci.yml)
[![Web](https://github.com/Flux-Frontiers/kpress_disulfide/actions/workflows/web.yml/badge.svg)](https://github.com/Flux-Frontiers/kpress_disulfide/actions/workflows/web.yml)
[![DOI](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.23679104-blue.svg)](https://doi.org/10.5281/zenodo.23679104)

# The Knowledge Press: The Disulfides

The third edition of The Knowledge Press. It reads the
[proteusPy](https://github.com/suchanek/proteusPy) disulfide database as a
web orchard you drive through in 3-D: every disulfide bond in the Protein
Data Bank, classified by its five side-chain torsions, grown as trees.

*Author: Eric G. Suchanek, PhD -- Flux-Frontiers, Liberty TWP, OH*

**Open the orchard:** https://flux-frontiers.github.io/kpress_disulfide/

- Each of the 32 binary classes is a tree. Its quadrant classes are the
  first ring of limbs and its octant classes the second, and a sample of
  each octant class's real bonds hang above it, tinted from blue (relaxed)
  to red (strained) by torsional energy.
- The trees of a class family (the left- and right-handed spirals, hooks
  and staples) stand together in a grove; each unnamed class has a grove of
  its own. At each grove's stop stands its representative, the model
  disulfide built from its largest class's consensus torsions.
- At the hub, the database tree carries every bond in its trunk and the 32
  binary classes as its limbs, in their families' colors. Beside it, the
  home disulfide stands on a monument, drawn from its own coordinates.

Drive up to a tree and open the reader for any class or sampled bond: a
class card gives its consensus torsions, energy, Cα distance, model and
members; a bond card links the PDB entry at the RCSB and draws the bond.
Add trees to your album, search PDB ids, class ids and family names with
the lantern, or ride the guided tour.

[web/LAYOUT.md](web/LAYOUT.md) describes how the orchard represents the
database. The repository started as a copy of
[kpress_family](https://github.com/Flux-Frontiers/kpress_family); see
[PROVENANCE.md](PROVENANCE.md).

## Databases to show

proteusPy writes the orchard's data (`proteusPy.export_web`) into
`web/public/forests/<slug>/`, with an index the start screen offers a choice
from. The exports are not committed. `make forest` drives the export from a
sibling proteusPy checkout (`PROTEUSPY_DIR`, default `../proteusPy`):

```bash
make demos                    # the subset that ships with proteusPy: 4,575 bonds, and make art
make forest FOREST=full       # the full database: 158,965 bonds, about 11 s and 52 MB
make web-dev
```

The export keeps only the bonds within proteusPy's distance cutoffs,
Cα-Cα under 6.71 Å and Sγ-Sγ under 2.12 Å (`CA_CUTOFF`, `SG_CUTOFF`). On
the full database that is the published set of the Springer chapter,
158,965 bonds in 35,367 structures, of the 175,277 the loader holds.

`FOREST_HOME=<key>` names the disulfide the monument opens on; otherwise it
is the export's lowest-energy bond (`2q7q_75D_140D` on the full database).
`FOREST_MEMBERS` sets how many bonds are sampled per octant class (default
12), and `FOREST_MIN_MEMBERS` how many an octant class needs for its own
limb.

`make art` copies Art Techno's Spirits of Life and Innovation
(`ART_TECHNO_DIR`, default `../art_techno`), each in her own exhibit glade;
it also writes simplified copies drawn from afar, with art_techno's
gltf-transform (`npm install` in `../art_techno/web` first). Their models
are CC BY-NC 4.0 and not committed here (see [PROVENANCE.md](PROVENANCE.md)).

`?forest=<slug>` opens that database; otherwise the one chosen last on this
device, or the first. Each database keeps its own album and home
disulfide. `?home=<key>` opens on that bond's monument; otherwise it is the
bond chosen with "Make this the home disulfide" in the reader. `?tree=<id>`
opens beside a binary class's tree, for example `?tree=00000b`.

## Build and test

Needs Node 22.

```bash
make web-install   # once
make web-test      # node test suite
make web-build     # typecheck and production build
make web-dev       # dev server on port 5173
make gallery       # a portrait of each class tree into renders/lines (needs web-dev)
```

The tests run against a trimmed subset export committed under
`web/tests/fixtures/subset/`.

## Citation

If you use The Disulfides in your research or project, please cite it:

> Suchanek, E. G. (2026). *The Knowledge Press: The Disulfides* (Version 0.1.0) [Software]. Flux-Frontiers. https://doi.org/10.5281/zenodo.23679104

```bibtex
@software{suchanek_kpress_disulfide,
  author    = {Suchanek, Eric G.},
  title     = {The {Knowledge Press}: The Disulfides},
  version   = {0.1.0},
  year      = {2026},
  publisher = {Flux-Frontiers},
  doi       = {10.5281/zenodo.23679104},
  url       = {https://github.com/Flux-Frontiers/kpress_disulfide},
}
```

The same metadata is in [`CITATION.cff`](CITATION.cff). The disulfide
database, its classification and the published set the orchard shows are
proteusPy's; please cite them too:

> Suchanek, E. G. (2024). proteusPy: A Python package for protein structure and disulfide bond modeling and analysis. *Journal of Open Source Software*, 9(100), 6169. https://doi.org/10.21105/joss.06169

> Suchanek, E. G. (2026). Structural analysis of disulfide bonds in the Worldwide Protein Data Bank using proteusPy. In P. J. Hogg (Ed.), *Functional Disulphide Bonds: Methods and Protocols* (2nd ed., Methods in Molecular Biology, Vol. 3016, pp. 15-32). Springer US. https://doi.org/10.1007/978-1-0716-5158-2_2

## License

`web/` is under the Elastic License 2.0 ([LICENSE](LICENSE)). Names and
artwork are covered by [TRADEMARK.md](TRADEMARK.md). The PDB is public data;
the database and its classification are proteusPy's
([CITATION.cff](CITATION.cff)).
