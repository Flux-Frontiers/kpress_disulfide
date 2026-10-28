# The Knowledge Press: The Disulfides

The Disulfides is a web orchard you drive through in the browser:
[flux-frontiers.github.io/kpress_disulfide](https://flux-frontiers.github.io/kpress_disulfide/).
It draws the [proteusPy](https://github.com/suchanek/proteusPy) disulfide
database, 158,965 disulfide bonds from 35,367 structures in the Protein
Data Bank, classified by their five side-chain torsions. Every binary class
grows as a tree, the trees of a class family stand together in a grove, and
you drive a lantern cart between them, open any class or bond to read it,
and collect the classes in your album.

This guide covers the orchard. The database, its classes and the export the
orchard reads are proteusPy's; see the
[proteusPy documentation](https://suchanek.github.io/proteusPy/) and its
`proteusPy.export_web`.

## Where to start

| You want to | Read |
| --- | --- |
| Drive the orchard for the first time | [Getting started](guide/getting-started.md) |
| Know what the trees, groves and colors mean | [The orchard](guide/the-orchard.md) |
| Learn the keys, the cameras and the guided tour | [Driving and the tour](guide/driving.md) |
| Read a class's torsions or a bond's PDB entry | [Reading a class or bond](guide/reading.md) |
| Find a PDB id or class, or send someone a link | [Finding and linking](guide/finding.md) |
| See the Spirits of Life and Innovation | [The exhibits](guide/exhibits.md) |
| Make the orchard faster | [Troubleshooting](guide/troubleshooting.md#the-orchard-is-slow) |

The source is at
[github.com/Flux-Frontiers/kpress_disulfide](https://github.com/Flux-Frontiers/kpress_disulfide),
licensed under the Elastic License 2.0. How the orchard represents the
database, with the numbers, is in
[LAYOUT.md](https://github.com/Flux-Frontiers/kpress_disulfide/blob/main/web/LAYOUT.md).
