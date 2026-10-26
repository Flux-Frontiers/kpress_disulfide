// A disulfide drawn ball-and-stick, as proteusPy's DisulfideVisualization
// ._render_ss draws its "bs" style: each atom a sphere of its CPK radius
// times bs_scale, each bond two half cylinders colored by the atom at each
// end. The colors, radii and scale come from the export's atoms.json, so the
// orchard cannot drift from proteusPy. One builder serves the stop-plaza
// representatives, the trees' foot plates, the hub's monument and
// the reader's drawing.
//
// Pure, no React or three, so the tests can run it.

import type { AtomsTable, Molecule } from "./classCatalog";

/** Where a molecule stands: its center in the world, a turn about the vertical, and metres per angstrom. */
export type Placement = { x: number; y: number; z: number; yaw: number; scale: number };

export type Ball = { x: number; y: number; z: number; r: number; color: string };

/** Half a bond: from its atom (a) to the bond's midpoint (b). */
export type Stick = { ax: number; ay: number; az: number; bx: number; by: number; bz: number; r: number; color: string };

/** The proteusPy tables a drawing needs. */
export type BallAndStickStyle = Pick<AtomsTable, "colors" | "radii" | "bs_scale" | "bond_radius">;

/**
 * The spheres and half bonds of one molecule at one placement.
 *
 * :param model: Atoms centered on their centroid, angstroms, and bonds as index pairs.
 * :param style: atoms.json's colors, radii, bs_scale and bond_radius.
 * :param at: The placement.
 * :returns: World-space balls and sticks, metres.
 */
export function ballAndStick(model: Molecule, style: BallAndStickStyle, at: Placement): { balls: Ball[]; sticks: Stick[] } {
  const c = Math.cos(at.yaw), s = Math.sin(at.yaw);
  // Turn about y, then scale and move.
  const world = model.atoms.map((a) => ({
    x: at.x + (a.x * c + a.z * s) * at.scale,
    y: at.y + a.y * at.scale,
    z: at.z + (-a.x * s + a.z * c) * at.scale,
  }));
  const color = (i: number) => style.colors[model.atoms[i]!.element] ?? "grey";
  // _render_ss draws the previous and next residues' atoms (beyond the 12 of
  // the two cysteines) at three quarters size, and their bonds at half.
  const balls = model.atoms.map((a, i) => ({
    ...world[i]!,
    r: (style.radii[a.element] ?? 1.5) * style.bs_scale * (i > 11 ? 0.75 : 1) * at.scale,
    color: color(i),
  }));
  const sticks: Stick[] = [];
  model.bonds.forEach(([i, j], k) => {
    const a = world[i]!, b = world[j]!;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
    const r = style.bond_radius * (k >= 11 ? 0.5 : 1) * at.scale;
    sticks.push({ ax: a.x, ay: a.y, az: a.z, bx: mid.x, by: mid.y, bz: mid.z, r, color: color(i) });
    sticks.push({ ax: b.x, ay: b.y, az: b.z, bx: mid.x, by: mid.y, bz: mid.z, r, color: color(j) });
  });
  return { balls, sticks };
}
