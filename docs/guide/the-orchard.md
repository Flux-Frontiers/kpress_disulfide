# The orchard

The orchard is a picture of the disulfide bonds in the Protein Data Bank,
as classified by [proteusPy](https://github.com/suchanek/proteusPy). Each
bond has five side-chain torsions, χ1 through χ5. proteusPy classifies a
bond three ways, each finer than the last, and each tier nests exactly in
the one above it:

| Tier | Example id | What it records | Classes |
| --- | --- | --- | --- |
| Binary | `00000b` | the sign of each torsion | 32 |
| Quadrant | `11111q` | which 90-degree sector each torsion falls in | 949 |
| Octant | `22222o` | which 45-degree sector each torsion falls in | 833 drawn |
| Bond | `2q7q_75D_140D` | one disulfide in one PDB entry | 158,965 |

Every class id carries its tier's letter: octant `22222o` and binary
`22222b` are different classes.

## A tree is a binary class

Each of the 32 binary classes grows as one tree:

- The **trunk** is the binary class.
- The **first ring of limbs** is its quadrant classes.
- The **second ring** is their octant classes.
- The **leaves** are a sample of each octant class's real bonds, lowest
  energy first, tinted by torsional energy from blue (relaxed) to red
  (strained).

A limb is as thick as the bonds it carries, so the busy classes stand out.
An octant class with too few bonds (fewer than 20) gets no limb of its own;
its count is folded into its quadrant's `-other` tip. **Prune sparse
octants** in the settings leaves those tips undrawn.

Every tree has a model disulfide at its foot, built from the class's
consensus torsions, and a signpost with its name and, where proteusPy
records one, its function.

## A grove is a class family

proteusPy names six families by the shape of the bond: the left- and
right-handed spirals, hooks and staples (LHSpiral, RHSpiral, LHHook, RHHook,
LHStaple, RHStaple). Each named family's sign variants stand together in one
grove, and each family grows as one species of tree. Each unnamed binary
class has a grove of its own: 18 groves in all, the unnamed classes on the
inner ring road and the named families on the outer.

At each grove's stop on the ring stands its representative, the model
disulfide built from its largest class's consensus torsions.

## The hub

At the center stands the database tree, with redwood bark: the whole
database as the 32 binary classes, its limbs colored by family. Click a limb
to go to that class's own tree.

Beside it, on a monument, is the home disulfide: the lowest-energy bond in
the database, `2q7q_75D_140D`, unless you choose another (see
[Make this the home disulfide](reading.md#the-home-disulfide)). Its tree's
wood is gilded, and the map marks its grove. Click the monument's plaque to
read it.

## Schematic trees

++v++ redraws every tree as a diagram: classes as beads on straight
aluminum limbs, cubes for the binary and quadrant classes, octahedra for the
octant classes, and a small dodecahedron for each sampled bond, colored by
its energy. Click a bead to open its class or bond in the reader.

## What the layout does not mean

The tree a bond is in, its tier, a limb's thickness and a leaf's color are
data. The distance between two classes is not: positions round a ring are
spacing for legibility, so two octant classes side by side are no closer in
torsion space than two on opposite sides. For the details, and what is left
out, see
[LAYOUT.md](https://github.com/Flux-Frontiers/kpress_disulfide/blob/main/web/LAYOUT.md).

## The sky

The sky is real astronomy for your time and place: the sun, the moon in its
true phase, the bright stars, the five naked-eye planets, and meteors at
tonight's rates. The season follows the date. The clock in the top bar
switches between Live and fixed Dawn, Day, Dusk and Night. With **Random
weather** on, mornings may be foggy and the sky may cloud over.
