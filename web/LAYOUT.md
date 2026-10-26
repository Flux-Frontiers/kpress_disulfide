# How the orchard represents the disulfide database

This page describes what each thing in the orchard stands for, how its
position and size are computed, and what the numbers come to for the two
exports. The data is proteusPy's (`proteusPy.export_web`, run by
`make forest`); this repo only reads it. The code is in `src/game/`; the
file named in each section is where that rule lives.

## The classification

proteusPy classifies every disulfide bond by its five side-chain torsions,
χ1 through χ5, at three resolutions. Each resolution is one tier of the
orchard, and each tier partitions the one above it exactly:

| Tier | Class id | What it records | Classes (subset / full) |
|---|---|---|---|
| Binary | `00000b` | the sign of each torsion | 32 / 32 |
| Quadrant | `11111q` | which 90-degree sector each torsion falls in | 595 / 969 |
| Octant | `22222o` | which 45-degree sector each torsion falls in | 530 / 933 drawn |
| Bond | `1xr9_203A_259A` | one disulfide in one PDB entry | 5,000 / 175,277 |

Every class id carries its tier's suffix. Octant `22222o` and binary
`22222b` are different classes. An octant class with fewer bonds than the
export's `min_members` (2 on the subset, 20 on the full database) gets no
limb of its own. It is folded, with its count kept, into its quadrant's
`<quadrant id>-other` tip (507 tips on the subset, 968 on the full).

The sextant tier is not drawn. It does not nest under the quadrant tier
(proteusPy issue, fleet sweep item 95).

## One tree per binary class

Each of the 32 binary classes is one tree (`classTree.ts`, `lineTree`):

- **Trunk:** the binary class, its top 3 m above the ground.
- **First ring of limbs:** its quadrant classes.
- **Second ring:** its octant classes and its `-other` tips.
- **Terminal spheres:** the sampled bonds of each octant class, up to 12
  (`--members-per-class`), lowest torsional energy first. They sit on a
  dome of radius 1 m above their octant class, spiralling down from the
  top at the golden angle. In the wood view each bond is a tuft of 7
  leaves. In the schematic it is a small sphere. Either way it opens that
  bond's card in the reader.

### Where a class stands on its ring

The layout is a radial tidy tree, as the Family's kinship trees were.
Each class needs an arc on its own ring: 1.2 m, or 2.2 m for an octant
class with sampled bonds, to clear its dome (`DOME_ARC`). Each ring's
radius is the larger of two values (`ringRadius`):

- the tier's own reach, 1 m per tier times the tree's scale;
- the sum of its classes' arcs, around the circle.

Going up a tier, a class's wedge is split among its children by what
each needs: the larger of its own arc on its ring and the wedges of its
children on theirs (`angleOf`). So no class gets less than its arc. A
child stands at its wedge's bearing, and its distance from the axis falls
as its wedge widens (`spanReach`).

The tree's scale is `sqrt(200 / nodes)`, clamped to 0.6 through 2.0. It
shrinks the tier reach of large trees and grows that of small ones,
until their rings must widen to fit their classes.

### How high each tier stands

Limbs climb at one pitch. Each tier rises tan(25°) times its ring's reach
past the ring below, held between 1.5 m and 8 m (`ringsOf`). So a narrow
tree is not a steep vase and a wide one is not a flat disc. Line trees
stand from about 7 m to 15 m to their top.

### How thick the wood is

Each class node's flow is its bond count divided by `min_members`, and
the radii follow the pipe model with exponent 2.2 (`pipeRadii`). A limb
is as thick as the bonds it carries, and the trunk as thick as the whole
binary class. Each edge is a quadratic curve that leaves along its
parent's direction and then reaches out, with a little seeded jitter.

### What the colors mean

- **Leaves and bond spheres** are colored by torsional energy, a fixed
  ramp in every season (`ENERGY_COLORS`, `energyTint`). The steps fall at
  1, 1.5, 2, 2.5, 3, 4 and 6 kcal/mol: blue for the most relaxed bonds,
  through teal, green and yellow, to red above 6 kcal/mol.
- **Class beads** in the schematic are colored by tier on a line tree:
  gold for the binary class, orange for its quadrant classes, red for its
  octant classes. On the database tree each binary class takes its
  family's grove color. Classes are cubes, bonds spheres, and the
  database tree's trunk is a gold diamond (`schematic.ts`).
- **Bark** takes the season's wood color.
- **Species** is set by class family (`classForest.speciesForGrove`):
  LHSpiral oak, RHSpiral horse chestnut, LHHook London plane, RHHook stone
  pine, LHStaple silver birch, RHStaple weeping willow, and every unnamed
  class silver fir.

## Groves: one per class family

A grove is a class family (`forest.ts`, `getForest`). The six named
families (LHSpiral, RHSpiral, LHHook, RHHook, LHStaple, RHStaple) each
hold their 3 or 4 sign variants: -LHSpiral `00000b`, +LHSpiral and so on.
Each of the 12 unnamed binary classes is a grove of its own, for 18
groves.

Within a grove, trees are seated largest crown first (`shyLayout`). Each
takes the innermost spot on a sunflower spiral where its trunk stands at
least 7.5 m from every other trunk, and its crown keeps 3 m of clear
ground, seen from above, from every crown already standing.

Groves stand on a hub-and-spoke wheel of ring roads around the hub
(`wheelLayout`), seated in occupancy order: the named families first,
then the unnamed classes, each set largest first. The guided tour visits
them in that order. Each grove's signpost gives the family's name, its
bond count and share, and a function plate (Allosteric for -RHStaple,
Catalytic for both RHHook variants, blank otherwise).

## Model disulfides

proteusPy builds a model disulfide from a class's consensus torsions
(10 atoms, 9 bonds, no carbonyl O). The orchard draws it ball-and-stick
with proteusPy's own colors and radii (`atoms.json`, `molecule.ts`):

- **Representative** at each grove's stop: the model of its largest
  class, at 0.22 m per angstrom on a plinth.
- **Foot plate** at each tree: that binary class's own model, at 0.08 m
  per angstrom.
- **Monument** on the hub plaza: the home disulfide, drawn from its real
  coordinates (12 to 16 atoms), at 0.35 m per angstrom, with its plaque.

## The hub

The database tree stands at the hub (`hubTree`). Its trunk, 6 m tall, is
every bond; its one ring of limbs is the 32 binary classes, each as thick
as its bonds and leafed in its family's grove color, the minimap's. It
stops there: at the hub the quadrant and octant tiers were thousands of
classes no one could read, and each binary class grows as its own tree in
the groves. It stands about 10 m tall. Bark is redwood.

The home disulfide is the export's lowest-energy bond unless the reader
or `?home=<key>` names another sampled bond: `1xr9_203A_259A` on the
subset, `2q7q_75D_140D` on the full database. Its own tree's wood is
gilded from the ground to its leaf, and the minimap marks its grove.

## Labels

Name plates (N, off by default) show over the tree nearest the cart once
it is within 14 m, and never over the start screen. Twice a second they
are laid out on screen in tier order, trunk first. A plate that would
cover one already placed is left out, so a dense crown shows its coarse
classes first and opens up as the cart draws closer (`NamePlates.tsx`,
`schematic.declutter`).

## Worked examples

Measured from the exports in `public/forests/` with the current code.

| | Subset | Full |
|---|---|---|
| Bonds | 5,000 in 1,038 PDB entries | 175,277 in 36,968 PDB entries |
| `min_members` | 2 | 20 |
| Sampled bonds (leaves) | 2,413 | 11,196 |
| Largest tree | `00000b`, 1,158 bonds, 582 nodes, 14.6 m tall, reach 31.0 m | `00000b`, 40,943 bonds, 1,677 nodes, 14.8 m tall, reach 50.6 m |
| Smallest tree | `20202b`, 12 bonds, 16 nodes, 6.9 m tall, reach 4.1 m | `20202b`, 538 bonds, 120 nodes, 7.9 m tall, reach 7.6 m |
| Line tree height | 6.8 to 14.6 m | 7.7 to 14.8 m |
| Database tree | 33 nodes, 9.8 m tall, reach 8.0 m | 33 nodes, 9.8 m tall, reach 8.0 m |
| LHSpiral grove radius | 55.4 m | 91.3 m |
| Orchard radius (outermost grove edge) | 188 m | 312 m |
| Home disulfide | `1xr9_203A_259A`, 0.49 kcal/mol | `2q7q_75D_140D`, 0.49 kcal/mol |

Build either with `make forest FOREST=subset` or `make forest
FOREST=full`; the full export takes about 11 s and writes 57 MB.
