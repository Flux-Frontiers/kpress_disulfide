// Class trees whose wood is the class hierarchy: a class's limb branches from
// the class one tier up, and a member's twig from its octant class. This is a
// layout, not growth, as the Family's kinship trees are (kpress_family
// familyTree.ts, whose radial tidy tree this keeps): every tier is a ring of
// wood above the last, and a class whose descendants spread over a wide
// wedge stands nearer the axis, so its children's limbs run out and up.
//
// Two shapes:
//
// * A line tree (`lineTree`): one binary class. The class is the trunk top;
//   its quadrant classes are the first tier of limbs, their octant classes
//   (and an `other` tip for the folded ones) the second, and each sampled
//   member a short twig from its octant class, where its leaves hang.
// * The database tree (`hubTree`): the whole classification at the hub. The
//   trunk is every bond; the binary classes are the first tier, quadrant
//   classes the second, octant classes the third, with no members.
//
// Wedges are split by the nodes drawn below each class (the Family's
// descendant weight), and the wood is as thick as the bonds it carries: each
// class node's flow into the pipe model is its count over the export's
// `min_members`. The classes partition each other, so nothing is placed
// twice and `skipped` is always 0.

import type { ClassIndex } from "./classCatalog";
import { pipeRadii, type Skeleton } from "./growTree";
import { mulberry32, seedFromKey } from "./math";

/** Trunk, from the ground to the first fork. */
export const TRUNK_HEIGHT = 3.0;
/** Rise per tier. */
export const TIER_UP = 2.0;
/** Radial reach per tier before the crowding floor. */
const RING = 1.0;
/**
 * Least arc between two classes on one ring, m, whatever the tree's scale: a
 * crowded tier widens rather than packing its classes shoulder to shoulder.
 */
const MIN_LEAF_ARC = 1.2;
/**
 * An octant class's members hang on a dome above it, this far from the class
 * node, m, whatever the tree's scale: a fan of twigs at the class's height
 * crowded into its neighbours on the ring.
 */
const MEMBER_DOME = 1.0;
/** The dome's rim, radians from straight up: the members fill the cap within it. */
const MEMBER_CAP = 1.2;
/** Turn between successive members round the dome: the golden angle, so none line up. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** Curve points inserted per edge. */
export const EDGE_SUBDIVISIONS = 3;
/** Sideways jitter on those points, as a fraction of the edge. */
const EDGE_JITTER = 0.08;
const SIZE_REFERENCE_POPULATION = 200;
const MIN_SIZE_SCALE = 0.6;
const MAX_SIZE_SCALE = 2.0;
/** kg_utils.viz3d.organic.PIPE_EXPONENT */
const PIPE_EXPONENT = 2.2;
const TIP_RADIUS = 0.03;

/** A line tree's rise per tier, as a multiple of TIER_UP: its depth is fixed, so its height is too. */
const LINE_TIER_STRETCH = 1.5;
/** The database tree's reach: the orchard's widest tree, whatever its population. */
export const HUB_SCALE = 3.0;
/**
 * The database tree's tiers hold hundreds of classes, too many for one ring
 * at its reach. A crowded ring is stacked into layers, this far apart, m:
 * its classes take turns round the ring, layer by layer, so neighbours
 * stand on different layers and classes on one layer keep MIN_LEAF_ARC.
 */
const STACK_RISE = 0.8;
/** Each layer stands this much nearer the axis than the one below, as a fraction of the ring at the top layer: a crown, not a tube. */
const STACK_LEAN = 0.3;
/** The database tree's reach per tier, before its scale: wider than a line tree's, for its crowded crown. */
const HUB_RING = 2.7;
/** The database tree's trunk node id. */
export const HUB_ROOT = "database";

/** Tiers, from the trunk: a line tree's binary class or the database is 0. */
export const TIER = { binary: 0, quadrant: 1, octant: 2, member: 3 } as const;

export type TreePerson = {
  /** A class id, a member key, or HUB_ROOT. */
  id: string;
  /** This node in the skeleton. */
  node: number;
  /** Tiers from the trunk node (the name the shared renderers use). */
  generation: number;
  /** Always false: the Family's married-in twig has no counterpart here. */
  marriedIn: boolean;
  /** A member disulfide, not a class. */
  member: boolean;
  x: number;
  y: number;
  z: number;
};

export type ClassTree = {
  /** Curved wood with pipe-model radii, ready for emitBark. Node 0 is the ground point. */
  skeleton: Skeleton;
  people: TreePerson[];
  trunkHeight: number;
  scale: number;
  /** Edges not drawn because their target was already placed; 0 in a strict partition. */
  skipped: number;
};

type P3 = [number, number, number];

class Builder {
  points: P3[] = [];
  parents: number[] = [];
  flow: number[] = [];
  people: TreePerson[] = [];
  placed = new Set<string>();
  skipped = 0;

  add(p: P3, parent: number, id: string | null, generation = 0, flow = 0, member = false): number {
    const node = this.points.length;
    this.points.push(p);
    this.parents.push(parent);
    this.flow.push(flow);
    if (id !== null) {
      if (this.placed.has(id)) this.skipped++;
      this.placed.add(id);
      this.people.push({ id, node, generation, marriedIn: false, member, x: p[0], y: p[1], z: p[2] });
    }
    return node;
  }
}

const polar = (r: number, a: number, y: number): P3 => [r * Math.cos(a), y, r * Math.sin(a)];

function sizeScale(population: number): number {
  const raw = Math.sqrt(SIZE_REFERENCE_POPULATION / Math.max(population, 1));
  return Math.min(Math.max(raw, MIN_SIZE_SCALE), MAX_SIZE_SCALE);
}

/**
 * How far out on its ring a class stands, as a fraction of the ring: all the
 * way for a narrow wedge, less as the wedge its descendants fill widens, and
 * on the axis for the whole circle.
 */
function spanReach(span: number): number {
  return Math.sqrt(Math.max(0, 1 - span / (2 * Math.PI)));
}

/** What a tree draws: which classes hang from which, and each node's weight. */
type Shape = {
  kids: (id: string) => string[];
  members: (id: string) => string[];
  /** Bonds through the node, over min_members: its flow into the pipe model. */
  flow: (id: string) => number;
};

/** `stack`: stack crowded rings into layers (the database tree). */
type Frame = { scale: number; trunkHeight: number; tierUp: number; ring: number; arc: number; stack: boolean };

/** One tier's ring: its radius, the height of its lowest layer, how many layers, and how many classes are placed so far. */
type Ring = { radius: number; y: number; layers: number; placed: number };

/** Nodes drawn at and below `id`, counting itself: its wedge's weight. */
function weightOf(shape: Shape, id: string, cache: Map<string, number>): number {
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  let w = 1 + shape.members(id).length;
  for (const k of shape.kids(id)) w += weightOf(shape, k, cache);
  cache.set(id, w);
  return w;
}

function tierCounts(shape: Shape, root: string): Map<number, number> {
  const counts = new Map<number, number>();
  const walk = (id: string, gen: number) => {
    counts.set(gen, (counts.get(gen) ?? 0) + 1);
    for (const k of shape.kids(id)) walk(k, gen + 1);
  };
  walk(root, 0);
  return counts;
}

function ringRadius(tier: number, count: number, f: Frame): number {
  return Math.max(tier * f.ring * f.scale, (count * f.arc) / (2 * Math.PI));
}

/**
 * Every tier's ring above the trunk. A tier rises `tierUp` above the top
 * layer of the tier below; a stacked tier has as many layers as it needs
 * for MIN_LEAF_ARC between classes on one layer, even on its innermost.
 */
function ringsOf(counts: Map<number, number>, f: Frame): Map<number, Ring> {
  const rings = new Map<number, Ring>();
  let y = f.trunkHeight;
  for (let tier = 1; counts.has(tier); tier++) {
    const count = counts.get(tier)!;
    const radius = ringRadius(tier, count, f);
    const arc = (2 * Math.PI * radius * (1 - STACK_LEAN)) / count;
    const layers = f.stack ? Math.max(1, Math.ceil(MIN_LEAF_ARC / arc)) : 1;
    y += f.tierUp;
    rings.set(tier, { radius, y, layers, placed: 0 });
    y += (layers - 1) * STACK_RISE;
  }
  return rings;
}

/** The crown above `node`: a radial tidy tree, wedges by weight, members on a dome over each octant class. */
function placeCanopy(
  shape: Shape, b: Builder, f: Frame, rings: Map<number, Ring>, weights: Map<string, number>,
  id: string, node: number, gen: number, start: number, span: number,
): void {
  const here = b.points[node]!;
  const members = shape.members(id);
  if (members.length) {
    const mid = start + span / 2;
    // Equal areas of the cap, lowest energy at the top, spiralling down and out.
    const rim = 1 - Math.cos(MEMBER_CAP);
    members.forEach((key, j) => {
      const tilt = Math.acos(1 - ((j + 0.5) / members.length) * rim);
      const t = polar(MEMBER_DOME * Math.sin(tilt), mid + j * GOLDEN_ANGLE, MEMBER_DOME * Math.cos(tilt));
      b.add([here[0] + t[0], here[1] + t[1], here[2] + t[2]], node, key, gen + 1, 0, true);
    });
  }
  const kids = shape.kids(id);
  if (!kids.length) return;
  const kidWeights = kids.map((k) => weightOf(shape, k, weights));
  const total = kidWeights.reduce((a, w) => a + w, 0) || 1;
  const ring = rings.get(gen + 1)!;
  let c0 = start;
  kids.forEach((k, j) => {
    const kidSpan = (span * kidWeights[j]!) / total;
    const angle = c0 + kidSpan / 2;
    c0 += kidSpan;
    // A stacked ring's classes take turns round it, layer by layer: up and in.
    const layer = ring.placed++ % ring.layers;
    const lean = ring.layers > 1 ? 1 - (STACK_LEAN * layer) / (ring.layers - 1) : 1;
    const n = b.add(polar(ring.radius * spanReach(kidSpan) * lean, angle, ring.y + layer * STACK_RISE), node, k, gen + 1, shape.flow(k));
    placeCanopy(shape, b, f, rings, weights, k, n, gen + 1, angle - kidSpan / 2, kidSpan);
  });
}

/** Standard normal from a uniform source (Box-Muller). */
function normal(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/**
 * Curve every edge and size the wood by the pipe model, with each class's
 * occupancy as its flow.
 *
 * Each edge becomes a quadratic whose control point sits above the parent at
 * the child's height, so a limb leaves along the trunk's direction and then
 * reaches out. Parent-before-child order is kept.
 */
function finish(b: Builder, key: string, f: Frame, tipRadius: number): ClassTree {
  const rng = mulberry32(seedFromKey(`${key}:wood`));
  const pts: number[] = [];
  const parents: number[] = [];
  const flow: number[] = [];
  const map: number[] = [];
  for (let i = 0; i < b.points.length; i++) {
    const p = b.parents[i]!;
    const end = b.points[i]!;
    if (p < 0) {
      map[i] = parents.length;
      pts.push(...end);
      parents.push(-1);
      flow.push(0);
      continue;
    }
    const start = b.points[p]!;
    const ctrl: P3 = [start[0], end[1], start[2]];
    const d: P3 = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
    const length = Math.hypot(...d);
    // Sideways: delta x up, normalised; zero for a vertical edge.
    let sx = -d[2], sz = d[0];
    const sl = Math.hypot(sx, sz);
    if (sl > 1e-9) { sx /= sl; sz /= sl; } else { sx = 0; sz = 0; }
    let last = map[p]!;
    for (let k = 1; k <= EDGE_SUBDIVISIONS; k++) {
      const t = k / (EDGE_SUBDIVISIONS + 1);
      const a = (1 - t) ** 2, c = 2 * (1 - t) * t, e = t * t;
      const off = normal(rng) * EDGE_JITTER * length * Math.sin(Math.PI * t);
      pts.push(
        a * start[0] + c * ctrl[0] + e * end[0] + sx * off,
        a * start[1] + c * ctrl[1] + e * end[1],
        a * start[2] + c * ctrl[2] + e * end[2] + sz * off,
      );
      parents.push(last);
      flow.push(0);
      last = parents.length - 1;
    }
    map[i] = parents.length;
    pts.push(...end);
    parents.push(last);
    flow.push(b.flow[i]!);
  }
  const n = parents.length;
  const parentArr = Int32Array.from(parents);
  const radii = pipeRadii(parentArr, n, tipRadius, PIPE_EXPONENT, f.trunkHeight, Float32Array.from(flow));
  // Each edge into a node with nothing beyond it (a member's twig, a folded
  // tip, the database tree's octant classes) tapers to a fine tip from the
  // wood it leaves, as the Family's spouse twigs do.
  const hasChild = new Uint8Array(n);
  for (let i = 1; i < n; i++) if (parentArr[i]! >= 0) hasChild[parentArr[i]!] = 1;
  for (let i = 1; i < n; i++) {
    if (hasChild[i]) continue;
    const chain = [i];
    let k = parentArr[i]!;
    for (let s = 0; s < EDGE_SUBDIVISIONS && k > 0; s++, k = parentArr[k]!) chain.push(k);
    const from = radii[k]!;
    chain.forEach((node, j) => {
      const t = j / chain.length; // 0 at the tip
      radii[node] = Math.min(radii[node]!, TIP_RADIUS + (from - TIP_RADIUS) * t);
    });
  }
  const skeleton: Skeleton = { nodes: Float32Array.from(pts), parents: parentArr, radii, n };
  const people = b.people.map((p) => ({ ...p, node: map[p.node]! }));
  return { skeleton, people, trunkHeight: f.trunkHeight, scale: f.scale, skipped: b.skipped };
}

function grow(shape: Shape, root: string, key: string, f: Frame, tipRadius: number): ClassTree {
  const rings = ringsOf(tierCounts(shape, root), f);
  const b = new Builder();
  const ground = b.add([0, 0, 0], -1, null);
  const trunk = b.add([0, f.trunkHeight, 0], ground, root, 0, shape.flow(root));
  placeCanopy(shape, b, f, rings, new Map(), root, trunk, 0, 0, 2 * Math.PI);
  return finish(b, key, f, tipRadius);
}

/** A class's count as flow: bonds over the export's min_members, so the sparsest drawn tip is about 1. */
function flowOf(index: ClassIndex): (id: string) => number {
  const per = Math.max(1, index.catalog.meta.min_members);
  return (id) => {
    const c = index.cls.get(id)?.count ?? index.line.get(id)?.count;
    if (c !== undefined) return c / per;
    return id === HUB_ROOT ? index.catalog.meta.database.bonds / per : 0;
  };
}

/**
 * A line's tree: its binary class at the trunk top, quadrant and octant
 * classes above, members as twigs.
 *
 * :param lineId: A binary class id, such as `00000b`.
 * :throws: For an unknown line.
 */
export function lineTree(index: ClassIndex, lineId: string): ClassTree {
  if (!index.line.has(lineId)) throw new Error(`no such line: ${lineId}`);
  const shape: Shape = {
    kids: (id) => index.children.get(id) ?? [],
    members: (id) => (index.cls.get(id)?.members ?? []).map((m) => m.key),
    flow: flowOf(index),
  };
  const population = weightOf(shape, lineId, new Map());
  const scale = sizeScale(population);
  // The reach shrinks with the population, as the Family's does, but not the
  // height: every line tree has the same three tiers, and at the Family's
  // scaling a populous class grew 4 m tall and 26 m across.
  const f: Frame = { scale, trunkHeight: TRUNK_HEIGHT, tierUp: TIER_UP * LINE_TIER_STRETCH, ring: RING, arc: MIN_LEAF_ARC, stack: false };
  return grow(shape, lineId, `line:${lineId}`, f, TIP_RADIUS * scale);
}

/**
 * The database tree at the hub: every bond in the trunk, the binary classes
 * as the first tier, quadrant classes the second, octant classes (and the
 * folded tips) the third. No member leaves and no roots.
 */
export function hubTree(index: ClassIndex): ClassTree {
  const lines = [...index.catalog.lines].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)).map((l) => l.id);
  const shape: Shape = {
    kids: (id) => (id === HUB_ROOT ? lines : index.children.get(id) ?? []),
    members: () => [],
    flow: flowOf(index),
  };
  // A line tree's trunk and rise per tier; its crowded rings stack into a tall crown.
  const f: Frame = { scale: HUB_SCALE, trunkHeight: TRUNK_HEIGHT, tierUp: TIER_UP * LINE_TIER_STRETCH, ring: HUB_RING, arc: 0, stack: true };
  return grow(shape, HUB_ROOT, "hub", f, TIP_RADIUS);
}
