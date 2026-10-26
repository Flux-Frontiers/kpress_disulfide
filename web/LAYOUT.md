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

### Which bonds go in

The export takes the bonds exactly as `Load_PDB_SS` returns them
(`subset=True` for the subset): 5,000 bonds in 1,038 PDB entries, or
175,277 in 36,968. It applies no Cα or Sγ distance cutoff and no
resolution filter of its own, so the full export is not the Springer
chapter's filtered set of 158,965.

### How a bond gets its classes

Each torsion is reduced to one digit per tier
(`disulfide_tree.classify_angles`, angles modulo 360°), and the five
digits, χ1 first, plus the tier's suffix make the class id:

| Tier | Digit rule | Example |
|---|---|---|
| Binary | 2 for 0° to 180°, 0 for negative | `00000b`: all five negative, -LHSpiral |
| Quadrant | 4 for 0° to 90°, 3 for 90° to 180°, 2 for -180° to -90°, 1 for -90° to 0° | `11111q`: all five in -90° to 0° |
| Octant | 8 for 0° to 45°, down to 1 for -45° to 0° | `22222o`: all five in -90° to -45° |

Every octant sector lies inside one quadrant sector, which lies inside
one sign, so the tiers nest exactly.

### What each class records

Computed over all the class's bonds, not the sample: its count and share
of the database; its consensus torsions, the circular mean of each χ
with its circular standard deviation, sqrt(-2 ln R); its torsional
energy (proteusPy's, kcal/mol) and Cα-Cα distance (Å), each as mean and
standard deviation; and, for a binary class, its name and function from
`PDB_SS_class_definitions.csv`. These are what a class card in the
reader shows, so a card describes the whole class even when only a few
of its bonds are drawn.

## One tree per binary class

Each of the 32 binary classes is one tree (`classTree.ts`, `lineTree`):

- **Trunk:** the binary class, its top 3 m above the ground.
- **First ring of limbs:** its quadrant classes.
- **Second ring:** its octant classes and its `-other` tips.
- **Terminal spheres:** the sampled bonds of each octant class, up to 12
  (`--members-per-class`), lowest torsional energy first. The Bond
  complexity setting shows 1, 3, 6 or all of them per octant class; the
  classes stand in the same place at every setting, and the home
  disulfide always shows. They sit on a dome of radius 0.8 m above their
  octant class, spiralling down from the top at the golden angle. In the wood view each bond is a tuft of 7
  leaves. In the schematic it is a small sphere. Either way it opens that
  bond's card in the reader.

### Where a class stands on its ring

The layout is a radial tidy tree, as the Family's kinship trees were.
Each class needs an arc on its own ring: 1.0 m, or about 1.9 m for an
octant class with sampled bonds, to clear its dome (`DOME_ARC`). Each
ring's radius is the larger of two values (`ringRadius`):

- the tier's own reach, 1 m per tier times the tree's scale;
- the sum of its classes' arcs, around the circle.

A crowded ring splits into rows 2.4 m apart, up to four, as long as each
row saves at least 2 m of reach and the innermost stays a meter outside
the ring below: its classes take turns round the rows, so neighbors
stand in different rows and the ring needs a fraction of the
circumference.

Going up a tier, a class's wedge is split among its children by what
each needs: the larger of its own arc on its ring and the wedges of its
children on theirs (`angleOf`). Those can sum past a full turn, so all
the rings widen together until the trunk's wedges fit one. No class gets
less than its arc. A child stands at its wedge's bearing, and its
distance from the axis falls as its wedge widens (`spanReach`).

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
  family's grove color. Binary and quadrant classes are cubes, octant
  classes and folded tips octahedra, bonds spheres, and the database
  tree's trunk a large gold diamond (`schematic.ts`). The
  schematic's straight limbs are brushed aluminum.
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

Within a grove, trees are seated largest crown first (`shyLayout`). The
largest stands at the origin; each of the rest takes the innermost spot
within 45 degrees behind it on a sunflower spiral, where its trunk stands
at least 7.5 m from every other trunk and its crown keeps 3 m of clear
ground, seen from above, from every crown already standing.

The grove is then centered on the smallest circle round its trunks
(`enclosingCircle`), which, with the rest behind it, has the largest tree
on its rim, and turned so that tree faces the hub. A grove is as wide as
its trunks need, plus 3 m (`TRUNK_CLEAR`). Its crowns, which start well
above the cart, may reach past it and over the road, so each grove's
largest tree stands by the ring road.

Groves stand on a hub-and-spoke wheel of ring roads around the hub
(`wheelLayout`). The twelve unnamed classes take the inner ring and the
six named families, with the widest crowns, the outer, each set largest
first. A grove is seated by its trunks but spaced by its crowns: no two
groves' crowns overlap seen from above, no crown reaches the hub plaza or
the database tree, and the groves beside a spoke keep the whole spoke
clear. The guided tour rides out to the outer ring first, so it visits
the named families first, then the unnamed classes. Each grove's signpost gives the family's name, its
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

Where each model comes from: a binary class's is proteusPy's binary
consensus disulfide. An octant class's is proteusPy's octant consensus
disulfide; if there is none, it is built from the octant metrics' mean
torsions, and if those are missing, from its members' circular mean
(`model_source` in the export). A quadrant class has no model, since
proteusPy has none at that tier. A bond card draws the real bond: 12
atoms, or 16 when the flanking residues exist.

## The hub

The database tree stands at the hub (`hubTree`). Its trunk, 6 m tall, is
every bond; its one ring of limbs is the 32 binary classes, each as thick
as its bonds and leafed in its family's grove color, the minimap's. It
stops there: at the hub the quadrant and octant tiers were thousands of
classes no one could read, and each binary class grows as its own tree in
the groves. It stands about 10 m tall. Bark is redwood. A click on one of
its limbs, in either view, takes the cart to that class's tree.

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

## What you are really showing

### A sample of the bonds

Only a sample of real bonds is drawn: for each drawn octant class, its
members sorted by torsional energy, lowest first (ties by key), up to
`--members-per-class` (12). A folded octant class gets no sample. Every
sampled bond has a bond card. The Bond complexity setting then keeps the
first 1, 3 (the default), 6 or all of each sample, so it always keeps
the most relaxed.

| | Subset | Full |
|---|---|---|
| Sampled bonds | 2,413 (48.3% of the database) | 11,196 (6.4%) |
| Drawn at Low, 1 per octant class | 530 | 933 |
| Drawn at Medium, 3 | 1,349 | 2,799 (1.6%) |
| Drawn at High, 6 | 1,863 | 5,598 |
| Drawn at Ultra, all sampled | 2,413 | 11,196 |

Every bond still counts in its classes' statistics and in the thickness
of the wood that carries it.

### The leaves lean relaxed

Because each sample is the lowest-energy end of its class, the leaf and
bond-sphere colors are not the database's energy distribution. On the
full export:

| | Median energy, kcal/mol | Below 1.5 | Above 4 |
|---|---|---|---|
| Whole database | 3.19 | 14.3% | 33.6% |
| Ultra, all 11,196 sampled | 2.68 | 20.0% | 24.5% |
| Medium, 3 per octant class | 2.26 | 27.3% | 18.1% |
| Low, 1 per octant class | 2.09 | 30.7% | 15.8% |

So a leaf's color reads as "the most relaxed members of this octant
class look like this", not "this class's bonds are this relaxed"; the
class's own mean energy is on its card. On the subset the bias is small
(median 3.26 for the database, 2.97 sampled), because half its octant
classes have 3 or fewer bonds and are sampled whole. A drawn octant class
holds a median of 3 bonds on the subset and 46 on the full export, up to
12,323 (`22222o`).

### What the layout encodes, and what it doesn't

Encodes data: which tree and grove a bond is in (its binary class and
family); the ring and height (its tier); a limb's thickness (the bonds it
carries); a leaf's or bond sphere's color (that bond's energy); the order
round a ring (most populous first, each class in its parent's wedge, so
related classes sit together); and the grove order (by bond count, the
unnamed classes inside, the named families outside).

Does not encode data: the distance between two classes, in a tree or
across the orchard. Positions on a ring are spacing for legibility:
wedges sized by the room each class and its children need, crowded rings
in up to four rows, rings widened until everything fits. Two octant
classes side by side are no closer in torsion space than two on opposite
sides. Nor do a tree's height and reach (each tier rises at a fixed 25°
pitch, and a tree is wide because it has many classes), the way a grove
faces (its largest tree turns to the hub), the species (one per family,
for recognition), or the angle round a bond dome (only the order down it,
lowest energy on top).

### What is left out

- Most bonds as individuals: on the full export 6.4% are sampled and
  1.6% drawn at the default setting.
- Sparse octant classes: below `min_members` they appear only as counts
  in `-other` tips, with no model and no sample. On the full export that
  is 8,764 octant classes in 968 tips, holding 16.6% of the bonds (941
  classes in 507 tips, 18.8%, on the subset).
- The sextant tier, which does not nest, and a quadrant model, which
  proteusPy does not have.
- Any filter beyond what `Load_PDB_SS` applies.
- Hydrogens, and side chains beyond the two cysteines and their flanking
  atoms.

## Worked examples

Measured from the exports in `public/forests/` with the current code.

| | Subset | Full |
|---|---|---|
| Bonds | 5,000 in 1,038 PDB entries | 175,277 in 36,968 PDB entries |
| `min_members` | 2 | 20 |
| Sampled bonds (leaves) | 2,413 | 11,196 |
| Largest tree | `00000b`, 1,158 bonds, 582 nodes, 12.6 m tall, reach 19.5 m | `00000b`, 40,943 bonds, 1,677 nodes, 14.7 m tall, reach 24.0 m |
| Smallest tree | `20202b`, 12 bonds, 16 nodes, 6.7 m tall, reach 4.0 m | `20202b`, 538 bonds, 120 nodes, 7.7 m tall, reach 7.6 m |
| Line tree height | 6.7 to 12.6 m | 7.5 to 14.7 m |
| Database tree | 33 nodes, 9.8 m tall, reach 8.0 m | 33 nodes, 9.8 m tall, reach 8.0 m |
| Ring roads | 37 m and 75 m | 55 m and 102 m |
| LHSpiral grove radius | 21.1 m | 25.4 m |
| Largest tree of each grove to nearest road | 5 to 6 m | 5 to 40 m |
| Any trunk to nearest road | median 6 m, at most 40 m | median 6 m, at most 45 m |
| Orchard radius (outermost grove edge) | 118 m | 173 m |
| Home disulfide | `1xr9_203A_259A`, 0.49 kcal/mol | `2q7q_75D_140D`, 0.49 kcal/mol |

Build either with `make forest FOREST=subset` or `make forest
FOREST=full`; the full export takes about 11 s and writes 57 MB.

## The settings

| Setting | Where | Default | Effect |
|---|---|---|---|
| `FOREST` | `make forest` | subset | Which database to export |
| `FOREST_MIN_MEMBERS` | `make forest` | 2 subset, 20 full | Bonds an octant class needs to be drawn; fewer fold into `-other`. Raising it gives fewer, smaller trees |
| `FOREST_MEMBERS` | `make forest` | 12 | Bonds sampled per drawn octant class, lowest energy first |
| `FOREST_HOME` | `make forest` | the lowest-energy bond | The monument's disulfide |
| Bond complexity | the app's settings | Medium (3), Low on a touch screen | How many of each sample are drawn |
| `?home=`, "Make this the home disulfide" | the URL, the reader | | The monument's disulfide for this visit or this device |
