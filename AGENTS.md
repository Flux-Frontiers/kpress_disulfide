# Agent Instructions

Guidance for any AI coding agent working in this repository. It says what
the repo is, where it stands, what is next, and the rules that are not
optional. Read `PROVENANCE.md` after this file.

## What this is

The Knowledge Press: The Disulfides. The third Knowledge Press edition: a
web orchard (`web/`, Vite, React, Three) over the proteusPy disulfide
database. Every disulfide structural class is grown as a tree, trees stand
in groves by class family, and the model disulfide built from each class's
consensus torsions stands in its grove as the class's representative. You
drive a cart through it.

The design is in the private fleet repo, not here:
`~/repos/kgrag_priv/docs/KNOWLEDGE_PRESS_DISULFIDE_PLAN.md` (the spec, with
an "As built" section recording where the build departed from it). Fleet
state is sweep item 94 in `~/repos/kgrag_priv/FLEET_SWEEP_PLAN.md`; item 95
is a proteusPy bug this edition works around. Open work and cross-repo
TODOs go there, never in this repo.

The repo started as a copy of `kpress_family` (The Family) at `22699d8`,
which itself started as a copy of `knowledge_press` (The Forest). The
three are maintained separately. Never change `kpress_family` or
`knowledge_press` for this edition; a fix made here is ported by hand.

## The data

proteusPy writes the orchard's data; this repo only reads it.

- `proteusPy.export_web` (in `../proteusPy`, merged in
  [proteusPy#62](https://github.com/suchanek/proteusPy/pull/62)) writes
  `web/public/forests/<slug>/`: `catalog.json` (`meta`, `groves`, `lines`,
  `classes`, `home`), `classes/<id>.json`, `bonds/<key>.json`,
  `atoms.json`, `about.json`. `make forest` drives it for the full
  database from `PROTEUSPY_DIR ?= ../proteusPy`; `make demos` is that and
  `make art`. The exports are gitignored. The app offers only the full
  database; the subset survives only as the test fixture, a trimmed subset
  export under `web/tests/fixtures/subset/`.
- A grove is a class family: the six named families (LHSpiral, RHSpiral,
  LHHook, RHHook, LHStaple, RHStaple) plus one grove per unnamed binary
  class, 18 in all: unnamed inner, named outer (EGS, #4). A line is a binary class (32). A
  tree is a line: the class at the trunk top, its quadrant classes as the
  first tier, its octant classes as the second, sampled members as leaves
  tinted by torsional energy. The wood is binary > quadrant > octant >
  members and nothing else: the sextant tier does not nest (item 95), so
  never reintroduce it.
- Every class id carries its base suffix, everywhere: `00000b`, `1111q`
  is never written without its `q`, `22222o`. Octant `22222o` and binary
  `22222b` are different classes.
- Models built from torsions export 10 atoms and 9 bonds (no carbonyl O).
  Subset bonds have 12 atoms and 11 bonds; a complete bond 16 and 15.
  Coordinates are proteusPy's `internal_coords`, centered.
- The export keeps only bonds within proteusPy's cutoffs, Cα-Cα under
  6.71 Å and Sγ-Sγ under 2.12 Å (`CA_CUTOFF`, `SG_CUTOFF`): on the full
  database the published set, 158,965 of the loader's 175,277 bonds in
  35,367 structures; on the subset 4,575 of 5,000. The full export takes
  about 11 s and writes 52 MB. `2q7q_75D_140D`, the lowest-energy bond,
  is the full export's default home; the subset's is `1xr9_203A_259A`.

## Where it stands (2026-10-29)

Merged on `main`:

- `bbac51e`: the copy from `kpress_family`.
- [#1](https://github.com/Flux-Frontiers/kpress_disulfide/pull/1): the
  orchard. `classCatalog.ts`, `classTree.ts`, `classForest.ts`,
  `molecule.ts`, `Molecules.tsx`; groves, trees, the database tree at the
  hub, representatives at the stop plazas, foot plates at the trees,
  function plates on the signposts, the home bond's monument and plaque,
  the start screen's database chooser.
- [#2](https://github.com/Flux-Frontiers/kpress_disulfide/pull/2): the
  reader (`ClassReader.tsx`, `classCards.ts`; class and bond cards, "Make
  this the home disulfide"); the wording throughout; name plates off by
  default and decluttered; sampled bonds on domes; fitted rings and one
  limb pitch; crowns clear of each other; the energy color ramp; the
  database tree as the 32 binary classes by family; `web/LAYOUT.md`. 162
  web tests.
- [#3](https://github.com/Flux-Frontiers/kpress_disulfide/pull/3): the
  root `README.md`, `web/README.md` and `CHANGELOG.md` (Unreleased).
- [#4](https://github.com/Flux-Frontiers/kpress_disulfide/pull/4): from
  EGS's live review. Groves sized by their trunks and spaced by their
  crowns, the unnamed classes on the inner ring and the named families on
  the outer, each grove's largest tree by its ring road; crowded rings in
  up to four rows; bond complexity; clickable hub limbs; R and F raise the
  view, T looks down on a tree whole; cruising on the rings; the hub
  plaque opens to read; octahedral octant beads and aluminum schematic
  limbs; `web/LAYOUT.md` says what the orchard really shows. 165 web
  tests.
- [#5](https://github.com/Flux-Frontiers/kpress_disulfide/pull/5): both
  databases re-exported within the cutoffs, the test fixture regenerated,
  `web/LAYOUT.md` re-measured.
- [#6](https://github.com/Flux-Frontiers/kpress_disulfide/pull/6): of the
  Forest's exhibits only the Double Helix; the start screen offers the
  full database first; the Spirit of Life in a glade of her own, her
  models copied by `make art`.
- [#7](https://github.com/Flux-Frontiers/kpress_disulfide/pull/7): the hub
  limbs family by family, each family one arc, without wander; the view
  tilts to straight up and down and stays where it is left until the view
  changes; riding the ring starts from the cart facing ahead; the Spirits'
  bronze at metalness 0.45, fitted once as loaded.
- [#8](https://github.com/Flux-Frontiers/kpress_disulfide/pull/8): Eureka,
  the Spirit of Innovation, in a third glade (`Spirits.tsx` serves both);
  the Prune setting, which leaves the folded `-other` tips undrawn in
  place (`ClassTree.reach` keeps every grove where it stands).
- [#9](https://github.com/Flux-Frontiers/kpress_disulfide/pull/9): the
  cart view stands on the bed (`CART_EYE` 2.2 m) gazing a little up
  (`CART_TILT`), a grove's sign at the center and the lantern out of
  view; `.agentkg/` ignored.
- [#10](https://github.com/Flux-Frontiers/kpress_disulfide/pull/10): the
  database tree's wood at 0.6 of its pipe-model girth (`HUB_GIRTH`).
- [#11](https://github.com/Flux-Frontiers/kpress_disulfide/pull/11): the
  Spirits drawn from simplified copies (`models/far`, written by `make art`
  with art_techno's gltf-transform) until within 30 m; lighter atoms.
- [#12](https://github.com/Flux-Frontiers/kpress_disulfide/pull/12): leaner
  fir, pine and oak leaves; on Ultra, god's eye drops from 9.9M to 5.9M
  triangles a frame.
- [#13](https://github.com/Flux-Frontiers/kpress_disulfide/pull/13): an
  exhibit opens its plaque when clicked; Look ahead (X, or the target
  button); raise and lower buttons on a touch screen; settings open at
  the top on iOS.
- [#14](https://github.com/Flux-Frontiers/kpress_disulfide/pull/14): the
  album's ranks from Undergraduate to Doctor of Philosophy; the cart
  carries a model of each class collected, on stands in two tiers. 159
  web tests.
- [#15](https://github.com/Flux-Frontiers/kpress_disulfide/pull/15): this
  file brought up to date through #14.
- [#16](https://github.com/Flux-Frontiers/kpress_disulfide/pull/16): the
  view above the cart looks down on the collection; C cycles in the cart,
  behind it, above it, god's eye; new defaults.
- [#17](https://github.com/Flux-Frontiers/kpress_disulfide/pull/17): the
  home disulfide seated on its plinth, held by a brass pin and lit.
- [#18](https://github.com/Flux-Frontiers/kpress_disulfide/pull/18): Home,
  and every jump, resets the look, tilt and height.
- [#19](https://github.com/Flux-Frontiers/kpress_disulfide/pull/19): the
  cart's models on brass pins over flat stands.
- [#20](https://github.com/Flux-Frontiers/kpress_disulfide/pull/20): full
  statues held only within 60 to 90 m of their glades, small far maps
  (Safari had reloaded the tab for its memory).
- [#21](https://github.com/Flux-Frontiers/kpress_disulfide/pull/21): the
  README and `CITATION.cff` to the fleet standard.
- [#23](https://github.com/Flux-Frontiers/kpress_disulfide/pull/23):
  **v0.1.0 released 2026-10-26**, with `release.yml` (a `v*` tag builds
  the orchard and publishes the GitHub Release; Zenodo archives it).
- [#24](https://github.com/Flux-Frontiers/kpress_disulfide/pull/24): the
  Zenodo concept DOI, 10.5281/zenodo.23679104.
- [#25](https://github.com/Flux-Frontiers/kpress_disulfide/pull/25): the
  orchard on GitHub Pages, its data from the draft `web-data` release.
- [#26](https://github.com/Flux-Frontiers/kpress_disulfide/pull/26): the
  disulfide and structure count badges; only the full database offered.
- [#27](https://github.com/Flux-Frontiers/kpress_disulfide/pull/27):
  `make web-data-publish` creates no second draft.
- [#28](https://github.com/Flux-Frontiers/kpress_disulfide/pull/28):
  schematic member beads as dodecahedra; on Ultra a frame peaks around 1M
  triangles in place of 9.8M.
- [#29](https://github.com/Flux-Frontiers/kpress_disulfide/pull/29): the
  user guide (`docs/`, `mkdocs.yml`), built by web.yml into
  `/docs/` beside the orchard; Eureka's plaque.
- v0.2.0, released 2026-10-28 (the Pages site, the guide, the full
  database only, dodecahedron beads).
- [#32](https://github.com/Flux-Frontiers/kpress_disulfide/pull/32): the
  logo, `logo.svg`, in the README. The Family and The Forest have logos
  in the same style.
- v0.2.1: this release (the logo).

Decided by EGS:

- The database tree stays at the hub as the 32 binary classes only,
  colored by family (#2: a crown of every tier was unreadable).
- Limbs climb at one pitch, 25 degrees, each tier rising 1.5 to 8 m (#2).
- The unnamed classes on the inner ring, the named families on the outer;
  the tour still meets the named families first (#4).
- No neighbor arcs for now (2026-10-26).
- The orchard shows the published set, within proteusPy's cutoffs
  (2026-10-26; proteusPy#63).
- The database tree keeps its redwood bark; the 18 groves stand; of the Forest's exhibits only
  the Double Helix stays, and Art Techno's Spirit of Life stands in a glade
  of her own, 10 m tall (2026-10-26; her models via `make art`, CC BY-NC
  4.0, never committed). Her Spirit of Innovation, Eureka, joined her in a
  third glade, 10 m tall (2026-10-26).
- The hub limbs keep their taper to the tips (blunt limbs were tried and
  rejected) and are drawn at 0.6 girth (#7, #10).
- The free look never recenters by itself; it resets when the view
  changes or the ring is ridden, and Look ahead brings it back (#7, #13).
- Ultra is the setting to optimize against. Shadows stay, leaves
  included; the leaves were simplified instead (#12).
- Only the full database is offered; the subset was dropped from the app
  and the site and kept only as the test fixture (2026-10-26, #26).
- The ranks run Undergraduate, Research Assistant, Graduate Student, PhD
  Candidate, Doctor of Philosophy; the cart carries models of the classes
  collected, in place of albums (#14).
- The disulfide database is static, so in general the `web-data` release
  needs no republishing and the count badges stay as they are
  (2026-10-28).

Nothing else is planned. Open with EGS: an app, and publishing.

Stills for review go in `renders/` (gitignored). The Family's approach
works: a puppeteer-core script against `make web-dev` on a port of its
own. Do not run `make web-kill`: it stops every Vite server on the
machine, including the ones EGS keeps running for other editions.

## Rules

- No release, no version bump and no tag until EGS says so. The repo is
  public (2026-10-26). The Pages site deploys from `main` (web.yml); its
  databases and models come from the draft `web-data` release, which only
  `make web-data-publish` updates, and only when EGS says what should be
  live.
- Work on a branch and open a PR. Never merge. No stacked PRs: a follow-up
  waits until the earlier PR merges.
- Commit messages and PR bodies are written to a file first and passed
  with `git commit -F` and `gh pr create --body-file`; never heredoc into
  `-m`. Commit with a pathspec, never a bare `git commit`.
- Run `pre-commit run --all-files` and fix findings before every commit.
  `make web-test` and `make web-build` must pass.
- Any proteusPy command: `cd ../proteusPy && env -u VIRTUAL_ENV -u
  POETRY_ACTIVE poetry run ...`. An inherited venv silently hijacks runs.
- Search with `rg`, never grep or find.
- Plain ASCII in prose, comments and commit messages: no em dashes,
  ellipsis characters or arrow glyphs (use `--`, `...`, `->`). American
  spelling. Docstrings in `:param:` style. Match the existing style; make
  surgical changes; no unrequested features.
- Browser storage keys are `kpd-*`. The Family runs on the same
  `localhost:5173` with `kpf-*`; do not share a prefix.
