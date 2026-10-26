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
//   member on a dome over its octant class, where its leaves hang.
// * The database tree (`hubTree`) at the hub. The trunk is every bond; its
//   one tier of limbs is the 32 binary classes, each tree's own class. The
//   finer tiers are in the line trees: at the hub they were thousands of
//   classes no one could read.
//
// Wedges are split by the arc each class needs on its ring, and every tier
// rises at one pitch over its reach. The wood is as thick as the bonds it carries: each
// class node's flow into the pipe model is its count over the export's
// `min_members`. The classes partition each other, so nothing is placed
// twice and `skipped` is always 0.

import type { ClassIndex } from "./classCatalog";
import { pipeRadii, type Skeleton } from "./growTree";
import { mulberry32, seedFromKey } from "./math";

/** Trunk, from the ground to the first fork. */
export const TRUNK_HEIGHT = 3.0;
/** Radial reach per tier before the crowding floor. */
const RING = 1.0;
/**
 * Least arc between two classes on one ring, m, whatever the tree's scale: a
 * crowded tier widens rather than packing its classes shoulder to shoulder.
 */
const MIN_LEAF_ARC = 1.0;
/**
 * An octant class's members hang on a dome above it, this far from the class
 * node, m, whatever the tree's scale: a fan of twigs at the class's height
 * crowded into its neighbours on the ring.
 */
const MEMBER_DOME = 0.8;
/** The dome's rim, radians from straight up: the members fill the cap within it. */
const MEMBER_CAP = 1.2;
/** Turn between successive members round the dome: the golden angle, so none line up. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** The arc an octant class with members needs on its ring, m: its dome's width and a member bead's clearance. */
const DOME_ARC = 2 * MEMBER_DOME * Math.sin(MEMBER_CAP) + 0.36;
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

/**
 * Limbs climb at about this pitch, radians: each tier rises
 * in proportion to how far its ring reaches past the one below, so a narrow
 * tree is not a steep vase and a wide one not a flat disc.
 */
const LIMB_PITCH = (25 * Math.PI) / 180;
/** The least and most a tier rises, m, whatever its reach. */
const MIN_RISE = 1.5;
const MAX_RISE = 8;
/** The database tree's reach: its ring of binary classes, m. */
const HUB_RING = 8.1;
/** The database tree's trunk, from the ground to its one fork, m: taller than a line tree's, as the orchard's centre. */
const HUB_TRUNK = 6.0;
/**
 * The database tree's wood, as a fraction of the pipe model's: carrying every
 * bond, its trunk came out 3.6 m across and overbearing at the hub. Limbs thin
 * with it, so their proportions to the trunk and each other hold.
 */
const HUB_GIRTH = 0.6;
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
  /**
   * The crown's reach from the trunk, m, over every class's place, drawn or
   * pruned: the groves are laid out by it, so pruning never moves a tree.
   */
  reach: number;
};

type P3 = [number, number, number];

class Builder {
  points: P3[] = [];
  parents: number[] = [];
  flow: number[] = [];
  people: TreePerson[] = [];
  placed = new Set<string>();
  skipped = 0;
  reach = 0;

  add(p: P3, parent: number, id: string | null, generation = 0, flow = 0, member = false): number {
    const node = this.points.length;
    this.reach = Math.max(this.reach, Math.hypot(p[0], p[2]));
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
  /** A class that keeps its place on its ring but is not drawn, nor anything beyond it (prune). */
  hidden?: (id: string) => boolean;
};

/**
 * `ring`: reach per tier, m, before the scale; a ring widens past it to fit its classes.
 * `jitter`: sideways wander on each edge, as a fraction of it (EDGE_JITTER if absent).
 */
type Frame = { scale: number; trunkHeight: number; ring: number; jitter?: number };

/** One tier's ring: its radius and height. */
/**
 * A crowded ring is split into rows this far apart, m: its classes take
 * turns, so neighbours stand in different rows and the ring needs a fraction
 * of the circumference. A dome is 1.5 m across; this keeps neighbouring domes apart.
 */
const ROW_GAP = 2.4;
/** At most this many rows to a ring. */
const MAX_ROWS = 4;
/** Another row only when it saves at least this much reach, m. */
const ROW_SAVING = 2;

/** One tier's ring: its outer radius and height, its rows, and how many classes are placed so far. */
type Ring = { radius: number; y: number; rows: number; placed: number };

/** Nodes drawn at and below `id`, counting itself: a tree's population, for its scale. */
function weightOf(shape: Shape, id: string, cache: Map<string, number>): number {
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  let w = 1 + shape.members(id).length;
  for (const k of shape.kids(id)) w += weightOf(shape, k, cache);
  cache.set(id, w);
  return w;
}

/** The arc a class needs on its ring, m. */
function arcOf(shape: Shape, id: string): number {
  return shape.members(id).length ? DOME_ARC : MIN_LEAF_ARC;
}

/** Each tier's classes: how many, and the arc they need between them. */
function tierNeeds(shape: Shape, root: string): Map<number, { count: number; arc: number }> {
  const tiers = new Map<number, { count: number; arc: number }>();
  const walk = (id: string, gen: number) => {
    const t = tiers.get(gen) ?? { count: 0, arc: 0 };
    t.count++;
    t.arc += arcOf(shape, id);
    tiers.set(gen, t);
    for (const k of shape.kids(id)) walk(k, gen + 1);
  };
  walk(root, 0);
  return tiers;
}

/**
 * A ring's outer radius and rows: as many rows, up to MAX_ROWS, as save
 * ROW_SAVING of reach each, the innermost row a metre outside the ring below.
 *
 * :param inner: The ring below's radius, m; 0 for the first ring.
 */
function ringRadius(tier: number, arc: number, f: Frame, inner: number): { radius: number; rows: number } {
  const reach = tier * f.ring * f.scale;
  let best = { radius: Math.max(reach, arc / (2 * Math.PI)), rows: 1 };
  for (let rows = 2; rows <= MAX_ROWS; rows++) {
    const depth = (rows - 1) * ROW_GAP;
    const radius = Math.max(reach, arc / (2 * Math.PI * rows) + depth, inner + 1 + depth);
    if (radius < best.radius - ROW_SAVING) best = { radius, rows };
  }
  return best;
}

/**
 * A class's wedge, radians: the larger of what it needs on
 * its own ring and what its children need on theirs, so the narrowest wedge
 * still clears its neighbours.
 */
function angleOf(shape: Shape, rings: Map<number, Ring>, id: string, tier: number, cache: Map<string, number>): number {
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  let below = 0;
  for (const k of shape.kids(id)) below += angleOf(shape, rings, k, tier + 1, cache);
  const ring = rings.get(tier);
  // In rows a class shares its arc with its neighbours in the other rows, on the innermost row's circle.
  const room = !ring ? 0 : ring.rows * (ring.radius - (ring.rows - 1) * ROW_GAP);
  const a = Math.max(ring ? arcOf(shape, id) / room : 0, below);
  cache.set(id, a);
  return a;
}

/**
 * Every tier's ring above the trunk, MIN_LEAF_ARC or DOME_ARC per class
 * round it, in rows when that needs less reach, every ring widened by
 * `widen`. A tier rises at LIMB_PITCH over its reach past the ring below,
 * held to MIN_RISE..MAX_RISE.
 */
function ringsOf(tiers: Map<number, { count: number; arc: number }>, f: Frame, widen = 1): Map<number, Ring> {
  const rings = new Map<number, Ring>();
  let y = f.trunkHeight, inner = 0;
  for (let tier = 1; tiers.has(tier); tier++) {
    const fit = ringRadius(tier, tiers.get(tier)!.arc, f, inner);
    const radius = fit.radius * widen, rows = fit.rows;
    y += Math.min(MAX_RISE, Math.max(MIN_RISE, Math.tan(LIMB_PITCH) * (radius - inner)));
    inner = radius;
    rings.set(tier, { radius, y, rows, placed: 0 });
  }
  return rings;
}

/**
 * The crown above `node`: a radial tidy tree, wedges by `weigh`, members on a
 * dome over each octant class. A hidden class (`node` -1) and everything above
 * it take their places, for the reach and the rows, but nothing is drawn.
 */
function placeCanopy(
  shape: Shape, b: Builder, f: Frame, rings: Map<number, Ring>, weigh: (id: string, tier: number) => number,
  id: string, node: number, gen: number, start: number, span: number,
): void {
  const members = node < 0 ? [] : shape.members(id);
  if (members.length) {
    const here = b.points[node]!;
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
  const kidWeights = kids.map((k) => weigh(k, gen + 1));
  const total = kidWeights.reduce((a, w) => a + w, 0) || 1;
  const ring = rings.get(gen + 1)!;
  let c0 = start;
  kids.forEach((k, j) => {
    const kidSpan = (span * kidWeights[j]!) / total;
    const angle = c0 + kidSpan / 2;
    c0 += kidSpan;
    // In rows, classes take turns, outermost first, round the ring.
    const r = ring.radius - (ring.placed++ % ring.rows) * ROW_GAP;
    const at = polar(r * spanReach(kidSpan), angle, ring.y);
    b.reach = Math.max(b.reach, Math.hypot(at[0], at[2]));
    const n = node < 0 || shape.hidden?.(k) ? -1 : b.add(at, node, k, gen + 1, shape.flow(k));
    placeCanopy(shape, b, f, rings, weigh, k, n, gen + 1, angle - kidSpan / 2, kidSpan);
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
      const off = normal(rng) * (f.jitter ?? EDGE_JITTER) * length * Math.sin(Math.PI * t);
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
  // tip, the database tree's binary classes) tapers to a fine tip from the
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
  return { skeleton, people, trunkHeight: f.trunkHeight, scale: f.scale, skipped: b.skipped, reach: b.reach };
}

function grow(shape: Shape, root: string, key: string, f: Frame, tipRadius: number): ClassTree {
  // Each ring fits its own classes, but a class's wedge is the larger of its
  // own arc and its children's, and those can sum past the circle: widen the
  // rings until the trunk's wedges fit in one turn.
  const tiers = tierNeeds(shape, root);
  let widen = 1, rings = ringsOf(tiers, f), angles = new Map<string, number>();
  for (let it = 0; it < 8; it++) {
    const total = shape.kids(root).reduce((a, k) => a + angleOf(shape, rings, k, 1, angles), 0);
    if (total <= 2 * Math.PI * 1.001) break;
    widen *= total / (2 * Math.PI);
    rings = ringsOf(tiers, f, widen);
    angles = new Map();
  }
  const weigh = (id: string, tier: number) => angleOf(shape, rings, id, tier, angles);
  const b = new Builder();
  const ground = b.add([0, 0, 0], -1, null);
  const trunk = b.add([0, f.trunkHeight, 0], ground, root, 0, shape.flow(root));
  placeCanopy(shape, b, f, rings, weigh, root, trunk, 0, 0, 2 * Math.PI);
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
 * classes above, members on domes.
 *
 * :param lineId: A binary class id, such as `00000b`.
 * :param bonds: Members shown per octant class, lowest energy first. The
 *   classes stand where they would with every member, so this never moves one.
 * :param keep: A member shown whatever `bonds` is: the home disulfide.
 * :param prune: Draw only the octant classes with their own limb: no `other`
 *   tips (the sparse octants folded together), and no quadrant class left
 *   with nothing above it. Every class keeps its place, so the gaps show.
 * :throws: For an unknown line.
 */
export function lineTree(index: ClassIndex, lineId: string, bonds = Infinity, keep?: string, prune = false): ClassTree {
  if (!index.line.has(lineId)) throw new Error(`no such line: ${lineId}`);
  const all = (id: string) => (index.cls.get(id)?.members ?? []).map((m) => m.key);
  const sparse = (id: string): boolean => {
    const c = index.cls.get(id);
    if (c?.level === "other") return true;
    return c?.level === "quadrant" && (index.children.get(id) ?? []).every(sparse);
  };
  const shape: Shape = {
    kids: (id) => index.children.get(id) ?? [],
    members: (id) => all(id).filter((key, j) => j < bonds || key === keep),
    flow: flowOf(index),
    hidden: prune ? sparse : undefined,
  };
  const population = weightOf({ ...shape, members: all }, lineId, new Map());
  const scale = sizeScale(population);
  // The reach shrinks with the population, as the Family's does, until its
  // rings must widen to fit their classes.
  const f: Frame = { scale, trunkHeight: TRUNK_HEIGHT, ring: RING };
  return grow(shape, lineId, `line:${lineId}`, f, TIP_RADIUS * scale);
}

/**
 * The database tree at the hub: every bond in the trunk and the 32 binary
 * classes as its limbs, family by family as the catalog lists them, so each
 * family's color holds one arc of the ring. No finer tiers, no members and
 * no roots, and no wander: 32 limbs from one fork cross each other with it.
 */
export function hubTree(index: ClassIndex): ClassTree {
  const lines = index.catalog.groves.flatMap((g) => g.lines);
  const shape: Shape = {
    kids: (id) => (id === HUB_ROOT ? lines : []),
    members: () => [],
    flow: flowOf(index),
  };
  const f: Frame = { scale: 1, trunkHeight: HUB_TRUNK, ring: HUB_RING, jitter: 0 };
  const tree = grow(shape, HUB_ROOT, "hub", f, TIP_RADIUS);
  for (let i = 0; i < tree.skeleton.n; i++) tree.skeleton.radii[i] = Math.max(TIP_RADIUS, tree.skeleton.radii[i]! * HUB_GIRTH);
  return tree;
}
