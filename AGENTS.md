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
  `atoms.json`, `about.json`. `make forest FOREST=subset|full` drives it
  from `PROTEUSPY_DIR ?= ../proteusPy`; `make demos` is the subset. The
  exports are gitignored; the test fixture is a trimmed subset export
  under `web/tests/fixtures/subset/`.
- A grove is a class family: the six named families (LHSpiral, RHSpiral,
  LHHook, RHHook, LHStaple, RHStaple) plus one grove per unnamed binary
  class, 18 in all, seated by occupancy. A line is a binary class (32). A
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
- The full loader holds 175,277 bonds; its export takes about 11 s and
  writes 57 MB. The subset is 5,000 bonds. `2q7q_75D_140D`, the
  lowest-energy bond in the database, is the full export's default home;
  the subset's is `1xr9_203A_259A`.

## Where it stands (2026-10-25)

Merged on `main`:

- `bbac51e`: the copy from `kpress_family`.
- [#1](https://github.com/Flux-Frontiers/kpress_disulfide/pull/1): the
  orchard. `classCatalog.ts`, `classTree.ts`, `classForest.ts`,
  `molecule.ts`, `Molecules.tsx`; groves, trees, the database tree at the
  hub with no pit, representatives on pads at the stop plazas, foot plates
  at the trees, function plates on the signposts, the home bond's
  monument and plaque on the hub plaza, the start screen's database
  chooser. 156 web tests.

Open in [#2](https://github.com/Flux-Frontiers/kpress_disulfide/pull/2)
(`feat/reader`), awaiting review:

- The reader: `ClassReader.tsx` and `classCards.ts` replace the Family's
  reader. Class cards from the catalog, bond cards from `bonds/<key>.json`,
  "Make this the home disulfide". `familyCatalog.ts` is gone.
- The wording: HUD, lantern, tour and grove narration, album ranks
  (Reader, Modeler, Refiner, Curator, Keeper of the Classes), About; "Show
  ancestors" is gone.
- From EGS's review of the live orchard: name plates off by default, never
  over the start screen, within 14 m, decluttered on screen in tier
  order; sampled bonds on a 1 m dome over their octant class; rings keep
  1.2 m of arc per class at every scale; crowns in a grove keep 3 m of
  clear ground; leaves and bond beads on a fixed energy ramp, blue to red;
  the database tree at line-tree height (about 13 m).
- `web/LAYOUT.md`: the representation, with both exports as worked
  examples. 162 web tests.

Not done, in order of value:

1. A `README.md` at the root and in `web/` (still the Family's), and a
   `CHANGELOG.md`. A follow-up PR after #2 merges.
2. Optional: neighbor arcs in god's eye between binary classes one sign
   flip apart.

Decided by EGS: the database tree stays at the hub, as tall as the line
trees (#2).

Open with EGS, decided from stills, not by an agent:

- **Tree heights.** Every line tree rises 3 m per tier, so the widest
  (`00000b`, 30 m reach on the full export) read flat, with long low
  limbs over the road. Letting the rise grow with the ring's radius would
  change tree heights: his call. Also whether the database tree keeps its
  redwood bark or takes a species.
- Grove count (18 is the default), which database ships, whether the
  exhibits beyond the Double Helix stay, an app, and publishing.

Stills for review go in `renders/` (gitignored). The Family's approach
works: a puppeteer-core script against `make web-dev` on a port of its
own. Do not run `make web-kill`: it stops every Vite server on the
machine, including the ones EGS keeps running for other editions.

## Rules

- No publish target, no Pages workflow, no release, no version bump, no
  tag, until EGS says so. The repo is private.
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
