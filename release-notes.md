# Release Notes -- v0.1.0

> Released: 2026-10-26

The first release of The Knowledge Press: The Disulfides, the third edition of
The Knowledge Press. It draws the proteusPy disulfide database as an orchard you
drive through in the browser: every disulfide bond in the Protein Data Bank,
classified by its five side-chain torsions, grown as trees. The full database
shows the published set of the Springer chapter, 158,965 bonds in 35,367
structures within proteusPy's Ca and Sg cutoffs.

## What changed

**An orchard of structural classes.** Each of the 32 binary classes is a tree:
its quadrant classes form the first ring of limbs, its octant classes the
second, and a sample of each octant class's real bonds hang above it, tinted
from blue to red by torsional energy. Trees stand in groves by class family,
the six named spirals, hooks and staples on the outer ring and the unnamed
classes on the inner. At the hub the database tree carries every bond in its
trunk, and the lowest-energy disulfide in the PDB, 2q7q 75D-140D at 0.49
kcal/mol, stands on its monument.

**Reading the classes and bonds.** A class card gives a class's consensus
torsions, energy, Ca distance, model, parent and children and sampled bonds; a
bond card links the PDB entry at the RCSB and draws the bond from its own
coordinates. The lantern searches PDB ids, class ids and family names, and the
guided tour speaks each family's classes as it drives the ring.

**A collection to earn.** Each class added to the album rides in the cart as a
model of its disulfide on a brass pin, and the album's ranks run from
Undergraduate to Doctor of Philosophy. A view above the cart looks down on the
collection.

**Settings for the view and the load.** Bond complexity, pruning of sparse
octants, schematic mode, a free look with Look ahead, raising and lowering the
view, and touch controls. Art Techno's Spirits of Life and Innovation stand in
glades of their own beside the Double Helix.

## Upgrading

This is the first release. The orchard reads databases written by
`proteusPy.export_web` (`make forest FOREST=full`, or `make demos` for the
subset) and the Spirits' models copied by `make art`; neither is in the
repository. The attached build is the web orchard alone, to serve with those
beside it.

---

_Full changelog: [CHANGELOG.md](CHANGELOG.md)_
