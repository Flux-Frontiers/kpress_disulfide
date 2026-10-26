# Changelog

All notable changes to The Knowledge Press: The Disulfides are recorded
here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- The web orchard, read from `proteusPy.export_web` databases in
  `web/public/forests/`: the subset (4,575 bonds) or the full database
  (158,965 bonds, the published set within proteusPy's Ca and Sg
  cutoffs), chosen on the start screen.
- One tree per binary class (32): its quadrant classes the first ring of
  limbs, its octant classes and folded `-other` tips the second, and up to
  12 sampled bonds per octant class on a dome above it. Every class gets
  the arc it needs on its ring, crowded rings split into up to four rows, and
  limbs climb at one pitch.
- Leaves and bond beads colored by torsional energy on a fixed ramp, blue
  for relaxed to red for strained.
- One grove per class family: the six named families and each unnamed
  binary class, 18 in all: the unnamed classes on the inner ring, the
  named families on the outer, each spaced by its crowns, with a species
  per family.
  A grove is sized by its trunks, with its largest tree by the ring road
  and its crowns reaching over the road.
- Model disulfides drawn ball-and-stick with proteusPy's colors and radii:
  each grove's representative at its stop, each tree's own model at its
  foot, and the home disulfide on the hub's monument, from its real
  coordinates.
- The database tree at the hub: every bond in the trunk and the 32 binary
  classes as its limbs, in their families' colors.
- The reader: a class card (consensus torsions with spreads, energy, Cα
  distance, the model, parent and children, sampled bonds with RCSB links)
  and a bond card (PDB entry, residues and chains, resolution, torsions,
  energy, Cα and Sγ distances, its class at each tier, the bond drawn).
  "Make this the home disulfide" moves the monument.
- The lantern search over PDB ids, class ids, family names and function
  words.
- The guided tour, which visits the named families' groves first, each set
  largest first, and speaks each family's classes, bonds, function and
  energy.
- The album, with ranks on the way to a doctorate: Undergraduate,
  Research Assistant, Graduate Student, PhD Candidate and Doctor of
  Philosophy. Each class collected rides in the cart as a model of its
  disulfide on a stand in its grove's color.
- Cameras in the order in the cart, behind it, above it, god's eye. The
  view above the cart looks down on the collection, which fills the bed
  from the front.
- Defaults: behind the cart, Medium bonds, sparse octants pruned and
  random weather on.
- Schematic mode (V): binary and quadrant classes as cubes and octant
  classes as octahedra, colored by tier, bonds as spheres colored by
  energy, on straight brushed-aluminum limbs.
- R and F raise and lower the view, up to 60 m.
- T, or "Whole tree" on a tree's card, looks down on the nearest tree whole;
  T again or driving comes back.
- The cart cruises faster out on the rings, up to 2.2 times, so a lap of
  any ring takes about as long as the inner one.
- The hub plaque opens to read in a panel, from its lectern or the hub
  card.
- Name plates (N), off by default: shown only near a tree and laid out so
  none covers another.
- `web/LAYOUT.md`, describing how the orchard represents the database.
- The Spirit of Life from Art Techno, 10 m tall in her own exhibit glade
  beside the Double Helix, floodlit at night; `make art` copies her
  models (CC BY-NC 4.0, not committed).
- Art Techno's Spirit of Innovation, Eureka, 10 m tall in a third
  exhibit glade, by the same treatment.
- Bond complexity in settings: 1, 3, 6 or every sampled bond per octant
  class, without moving a class; the home disulfide always shows.
- Prune sparse octants in settings: only the octant classes with their own
  limb are drawn, and the folded `-other` tips and any quadrant left with
  nothing else are left as gaps, without moving a class or a tree.
- A click on a limb of the database tree takes the cart to that binary
  class's tree.

### Changed

- Started as a copy of The Knowledge Press: The Family at `22699d8`; see
  `PROVENANCE.md`. The sky, weather, roads, cart, Double Helix and tour
  come from there unchanged; the Mysterium Cosmographicum and the
  armillary sundial were not kept.
- The start screen offers the full database first.
