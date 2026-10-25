// Schematic mode: the orchard drawn as a class diagram you can read while
// driving. Every class and sampled member is a bead where the layout
// (classTree.ts) puts it, its color the tier; the wood is straight barked
// limbs from each class to the classes and members one tier up. The layout
// is the same as the organic trees', so switching modes moves nothing.
//
// Pure, no React or three, so the tests can run it.

import type { ClassIndex } from "./classCatalog";
import { HUB_ROOT, hubTree, lineTree, type ClassTree } from "./classTree";

export type BeadShape = "round" | "square" | "diamond";

export type SchematicBead = {
  id: string;
  /** Shown on the name plate: the class id with its suffix, or the member's key. */
  name: string;
  x: number;
  y: number;
  z: number;
  /** Tiers from the tree's trunk node. */
  generation: number;
  shape: BeadShape;
  color: string;
  /** Always false; kept for the Family's name plates. */
  living: boolean;
  /** Always false; kept for the Family's name plates. */
  marriedIn: boolean;
  /** Index into the forest's trees, or -1 for the home tree. */
  tree: number;
};

export type SchematicSegment = { ax: number; ay: number; az: number; bx: number; by: number; bz: number };

export type Schematic = {
  beads: SchematicBead[];
  /** Parent to child, and each trunk from the ground to its first person. */
  limbs: SchematicSegment[];
  /** Always empty: the Family's marriage bars have no counterpart here. */
  bars: SchematicSegment[];
};

/** A bead per tier, outward from the trunk node. */
export const GENERATION_COLORS = ["#e8c547", "#e9883a", "#d6534f", "#b54d8f", "#6f5bc0", "#3f83c9", "#2fa7a0", "#5aa84a"];

/** The color of generation g; negative generations (ancestors) take the ramp from its far end. */
export function generationColor(g: number): string {
  const n = GENERATION_COLORS.length;
  return GENERATION_COLORS[((g % n) + n) % n]!;
}

/** A class is a cube, a member a sphere, the database tree's trunk a diamond. */
function shapeOf(id: string, member: boolean): BeadShape {
  return member ? "round" : id === HUB_ROOT ? "diamond" : "square";
}

/**
 * One tree's beads and limbs, placed at (ox, oz). Each node's limb runs to
 * it from the nearest node below it in the wood, or from the ground point
 * for the trunk.
 */
function addTree(t: ClassTree, tree: number, ox: number, oz: number, out: Schematic): void {
  const byNode = new Map(t.people.map((p) => [p.node, p]));
  const at = new Map(t.people.map((p) => [p.id, { x: ox + p.x, y: p.y, z: oz + p.z }]));
  const below = (node: number) => {
    for (let i = t.skeleton.parents[node]!; i >= 0; i = t.skeleton.parents[i]!) {
      const p = byNode.get(i);
      if (p) return p;
    }
    return null;
  };
  const seg = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): SchematicSegment =>
    ({ ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z });
  for (const p of t.people) {
    const here = at.get(p.id)!;
    out.beads.push({
      id: p.id,
      name: p.id,
      ...here,
      generation: p.generation,
      shape: shapeOf(p.id, p.member),
      color: generationColor(p.generation),
      living: false,
      marriedIn: false,
      tree,
    });
    const from = below(p.node);
    out.limbs.push(seg(from ? at.get(from.id)! : { x: ox, y: 0, z: oz }, here));
  }
}

/**
 * The whole orchard as a schematic: every line tree where the forest stands
 * it, and the database tree at the hub.
 *
 * :param trees: The forest's trees, in order: each line's slug and trunk position.
 */
export function buildSchematic(index: ClassIndex, trees: readonly { line: { slug: string }; x: number; z: number }[]): Schematic {
  const out: Schematic = { beads: [], limbs: [], bars: [] };
  trees.forEach((t, i) => addTree(lineTree(index, t.line.slug), i, t.x, t.z, out));
  addTree(hubTree(index), -1, 0, 0, out);
  return out;
}

/**
 * The bead a ray hits first, within `radius` of its center and `maxDist`
 * along the ray, or null.
 *
 * :param dir: Unit direction.
 */
export function pickBead(
  beads: readonly SchematicBead[],
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  radius: number,
  maxDist: number,
): SchematicBead | null {
  let best: SchematicBead | null = null, bestT = maxDist;
  for (const b of beads) {
    const ox = b.x - origin.x, oy = b.y - origin.y, oz = b.z - origin.z;
    const t = ox * dir.x + oy * dir.y + oz * dir.z;
    if (t < 0 || t > bestT) continue;
    const d2 = ox * ox + oy * oy + oz * oz - t * t;
    if (d2 <= radius * radius) { best = b; bestT = t; }
  }
  return best;
}

/** A name plate on screen, in normalized device coordinates: its center and half its width and height. */
export type PlateRect = { x: number; y: number; hw: number; hh: number };

/**
 * The plates to show so that none covers another: taken in the order given,
 * the coarser tiers first, each kept only if it overlaps no plate already
 * kept. A null is a plate off screen.
 *
 * :param rects: The plates' screen rectangles, in priority order.
 * :returns: The indexes of the plates kept.
 */
export function declutter(rects: readonly (PlateRect | null)[]): number[] {
  const kept: number[] = [];
  rects.forEach((r, i) => {
    if (!r) return;
    const clear = kept.every((k) => {
      const o = rects[k]!;
      return Math.abs(r.x - o.x) >= r.hw + o.hw || Math.abs(r.y - o.y) >= r.hh + o.hh;
    });
    if (clear) kept.push(i);
  });
  return kept;
}
