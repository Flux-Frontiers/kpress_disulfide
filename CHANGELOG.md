# Changelog

All notable changes to The Knowledge Press: The Disulfides are recorded
here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- The web orchard, read from `proteusPy.export_web` databases in
  `web/public/forests/`: the 5,000-bond subset or the full database of
  175,277 bonds, chosen on the start screen.
- One tree per binary class (32): its quadrant classes the first ring of
  limbs, its octant classes and folded `-other` tips the second, and up to
  12 sampled bonds per octant class on a dome above it. Every class gets
  the arc it needs on its ring, and limbs climb at one pitch.
- Leaves and bond beads colored by torsional energy on a fixed ramp, blue
  for relaxed to red for strained.
- One grove per class family: the six named families and each unnamed
  binary class, 18 in all, seated by occupancy, with a species per family.
  A grove is sized by its trunks; its crowns reach over the road.
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
- The album, with ranks: Reader, Modeler, Refiner, Curator and Keeper of
  the Classes.
- Schematic mode (V): classes as cubes colored by tier, bonds as spheres
  colored by energy, on straight brushed-aluminum limbs.
- Name plates (N), off by default: shown only near a tree and laid out so
  none covers another.
- `web/LAYOUT.md`, describing how the orchard represents the database.
- Bond complexity in settings: 1, 3, 6 or every sampled bond per octant
  class, without moving a class; the home disulfide always shows.
- A click on a limb of the database tree takes the cart to that binary
  class's tree.

### Changed

- Started as a copy of The Knowledge Press: The Family at `22699d8`; see
  `PROVENANCE.md`. The sky, weather, roads, cart, exhibits and tour come
  from there unchanged.
