// Turns the class layouts (classTree.ts) into what the forest renderer
// already draws: a line tree becomes a GrownTree whose leaves are tufts at
// each sampled member, tinted by its energy, and the database tree becomes
// the hub tree (a CorpusTree).
//
import type { ClassIndex, ClassLine } from "./classCatalog";
import type { ClassTree } from "./classTree";
import type { CorpusTree } from "./corpusTree";
import { REDWOOD_BARK } from "./corpusTree";
import { emitBark, type BarkBuffers, type GrownTree } from "./growTree";
import { mulberry32, seedFromKey } from "./math";

/** Leaves drawn per member: one leaf is invisible at driving distance. */
export const LEAVES_PER_PERSON = 7;
/** How far a member's tuft spreads around its node, m. */
const TUFT_RADIUS = 0.45;
/** Foliage sprays per binary class on the database tree. */
const SPRAYS_PER_PERSON = 16;

/**
 * Torsional energy (kcal/mol) at which a leaf's tint steps up: a member
 * below the first is tint 0, the coolest, and one above the last is tint 7,
 * the warmest. Leaf tint is the one place the data colors a tree.
 */
export const ENERGY_STEPS = [1, 1.5, 2, 2.5, 3, 4, 6];

/**
 * The color of each energy tint, coolest first: blue for a relaxed bond
 * through yellow to red for a strained one. Data, so it holds in every season.
 */
export const ENERGY_COLORS = ["#2c7bb6", "#00a6ca", "#00ccbc", "#90eb9d", "#ffff8c", "#f9d057", "#f29e2e", "#d7191c"];

/** A leaf's tint for a member's energy: 0 relaxed to 7 strained. */
export function energyTint(energy: number): number {
  let t = 0;
  while (t < ENERGY_STEPS.length && energy >= ENERGY_STEPS[t]!) t++;
  return t;
}

/**
 * The species each class family grows as (indexes into SPECIES): six named
 * families, six species; every unnamed class shares a seventh.
 */
const FAMILY_SPECIES: Record<string, number> = {
  lhspiral: 0,
  rhspiral: 1,
  lhhook: 3,
  rhhook: 5,
  lhstaple: 6,
  rhstaple: 7,
};
const UNNAMED_SPECIES = 2;

/** The species a grove grows as: fixed by its class family, so an orchard keeps it across rebuilds. */
export function speciesForGrove(grove: string): number {
  return FAMILY_SPECIES[grove] ?? UNNAMED_SPECIES;
}

/** Unit vector from a node's wood toward the sky: the leaves' stalk direction. */
function outward(tree: ClassTree, node: number): [number, number, number] {
  const { nodes, parents } = tree.skeleton;
  const p = parents[node]!;
  let dx = 0, dy = 1, dz = 0;
  if (p >= 0) {
    dx = nodes[node * 3]! - nodes[p * 3]!;
    dy = nodes[node * 3 + 1]! - nodes[p * 3 + 1]!;
    dz = nodes[node * 3 + 2]! - nodes[p * 3 + 2]!;
  }
  // Half along the limb, half up: a tuft faces outward and to the light.
  const l = Math.hypot(dx, dy, dz) || 1;
  const x = dx / l, y = dy / l + 1, z = dz / l;
  const m = Math.hypot(x, y, z) || 1;
  return [x / m, y / m, z / m];
}

/**
 * A line's tree as the renderer's GrownTree: the class wood, and a tuft of
 * leaves at every sampled member, tinted by its energy.
 *
 * :param key: Seeds the tufts.
 * :param energy: A member's torsional energy, kcal/mol.
 */
export function lineGrown(tree: ClassTree, key: string, energy: (member: string) => number | undefined): GrownTree {
  const rng = mulberry32(seedFromKey(`${key}:tufts`));
  const members = tree.people.filter((p) => p.member);
  const n = members.length * LEAVES_PER_PERSON;
  const leafPoints = new Float32Array(n * 3);
  const leafDirs = new Float32Array(n * 3);
  const leafTint = new Uint8Array(n);
  let k = 0;
  for (const p of members) {
    const [ox, oy, oz] = outward(tree, p.node);
    const tint = energyTint(energy(p.id) ?? 0);
    for (let j = 0; j < LEAVES_PER_PERSON; j++, k++) {
      const a = rng() * 2 * Math.PI, r = TUFT_RADIUS * Math.sqrt(rng());
      leafPoints.set([p.x + r * Math.cos(a), p.y + 0.15 * (rng() - 0.5), p.z + r * Math.sin(a)], k * 3);
      const jx = ox + 0.6 * (rng() - 0.5), jy = oy + 0.3 * rng(), jz = oz + 0.6 * (rng() - 0.5);
      const m = Math.hypot(jx, jy, jz) || 1;
      leafDirs.set([jx / m, jy / m, jz / m], k * 3);
      leafTint[k] = tint;
    }
  }
  return {
    skeleton: tree.skeleton,
    crown: new Float32Array(0),
    leafPoints,
    leafDirs,
    leafTint,
    nLeaves: n,
    nChunks: Math.max(1, members.length),
    // Internode length, for shyLayout's padding: a curve segment.
    step: 0.6 * tree.scale,
    trunkHeight: tree.trunkHeight,
    trunkRadius: tree.skeleton.radii[1] ?? 0.2,
    reach: tree.reach,
  };
}

/**
 * What the HUD, search, reader and album know of a line's tree. The shape is
 * the Family's line card, filled from a binary class until the reader and
 * its wording are rewritten for classes.
 */
export type LineCard = {
  /** The binary class id, as the catalog and `?tree=` name it. */
  slug: string;
  title: string;
  /** The class family's name. */
  surname: string;
  /** The grove id. */
  grove: string;
  /** The class's share of the database. */
  founders: string;
  /** Bonds in the class. */
  members: number;
  /** The class's share of the database, percent. */
  percentage: number;
  /** "Allosteric", "Catalytic", or "". */
  function: string;
  /** The class's mean torsional energy, kcal/mol, when the export gives one. */
  energy: number | null;
  span: string;
  summary: string;
  /** The sampled members' keys. */
  people: string[];
  /** Each sampled member and its energy, for the reader's list. */
  roster: { id: string; name: string; years: string }[];
  /** Lower-cased class ids, names, function and member keys, for the lantern. */
  search: string;
};

/** The album's ranks, lowest first. */
export const ALBUM_RANKS = ["Reader", "Modeler", "Refiner", "Curator", "Keeper of the Classes"] as const;

/**
 * The rank an album of `count` classes earns out of `total`: Reader for the
 * first class, Modeler at a tenth, Refiner at a quarter, Curator at half,
 * Keeper of the Classes with every class. Null for an empty album.
 */
export function albumRank(count: number, total: number): string | null {
  const need = [1, Math.ceil(total / 10), Math.ceil(total / 4), Math.ceil(total / 2), total];
  let rank: string | null = null;
  need.forEach((n, i) => {
    if (count >= Math.max(1, n)) rank = ALBUM_RANKS[i]!;
  });
  return rank;
}

/** "23.2%", or "<0.1%" for a sliver. */
export function percent(p: number): string {
  return p < 0.1 ? "<0.1%" : `${p.toFixed(1)}%`;
}

/** A binary class's card, for every place the UI shows a tree. */
export function lineCard(index: ClassIndex, line: ClassLine): LineCard {
  const grove = index.grove.get(line.grove);
  const classes = index.catalog.classes.filter((c) => c.line === line.id);
  const members = classes.flatMap((c) => c.members ?? []);
  const quadrants = classes.filter((c) => c.level === "quadrant").length;
  const octants = classes.filter((c) => c.level === "octant").length;
  const terms = [line.id, line.name, grove?.name ?? "", line.function, ...classes.map((c) => c.id), ...members.map((m) => m.key)];
  const bonds = line.count === 1 ? "one bond" : `${line.count.toLocaleString("en-US")} bonds`;
  return {
    slug: line.id,
    title: line.name === line.id ? line.id : `${line.name} (${line.id})`,
    surname: grove?.name ?? line.grove,
    grove: line.grove,
    founders: `${percent(line.percentage)} of the database`,
    members: line.count,
    percentage: line.percentage,
    function: line.function,
    energy: line.energy?.mean ?? null,
    span: "",
    summary: `${bonds}, ${percent(line.percentage)} of the database, in ${quadrants} quadrant and ${octants} octant classes.`
      + (line.function ? ` Function: ${line.function}.` : ""),
    people: members.map((m) => m.key),
    roster: members.map((m) => ({ id: m.key, name: m.key, years: `${m.energy.toFixed(2)} kcal/mol` })),
    search: terms.filter(Boolean).join(" | ").toLowerCase(),
  };
}

/** The hub tree: the database tree, and the home disulfide its monument shows. */
export type HomeTree = CorpusTree & {
  /** The home disulfide's key. */
  focal: string;
  /** The database's name for the plaque. */
  focalName: string;
};

/**
 * The database tree as the hub tree the renderer draws: bark from the class
 * wood and foliage sprays at each binary class, in its family's color.
 *
 * :param home: The home disulfide's key.
 * :param lines: Binary classes, for the plaque.
 * :param colorOf: A binary class's grove color.
 */
export function homeTree(tree: ClassTree, home: string, lines: number, name: string, colorOf: (line: string) => string): HomeTree {
  const { nodes, radii, n } = tree.skeleton;
  let height = 0;
  for (let i = 0; i < n; i++) height = Math.max(height, nodes[i * 3 + 1]!);
  const bark: BarkBuffers = { pos: [], normal: [], uv: [], index: [] };
  emitBark({ skeleton: tree.skeleton }, 0, 0, bark, REDWOOD_BARK.aspect, REDWOOD_BARK.tile);

  const rng = mulberry32(seedFromKey(`hub:${name}:sprays`));
  const crown = tree.people.filter((p) => p.generation > 0);
  const count = crown.length * SPRAYS_PER_PERSON;
  const pos = new Float32Array(count * 3);
  const scale = new Float32Array(count * 3);
  const quat = new Float32Array(count * 4);
  const shade = new Uint8Array(count);
  const color: string[] = [];
  let k = 0;
  for (const p of crown) {
    for (let j = 0; j < SPRAYS_PER_PERSON; j++, k++) {
      const yaw = rng() * 2 * Math.PI, tilt = (rng() - 0.5) * 0.6;
      pos.set([p.x + 0.3 * Math.cos(yaw), p.y + 0.1 * (rng() - 0.5), p.z + 0.3 * Math.sin(yaw)], k * 3);
      scale.set([0.9 * Math.min(tree.scale, 1.6), 1, 0.35 * Math.min(tree.scale, 1.6)], k * 3);
      // Yaw about y, then a small tilt about the spray's own x.
      const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2), ct = Math.cos(tilt / 2), st = Math.sin(tilt / 2);
      quat.set([cy * st, sy * ct, -sy * st, cy * ct], k * 4);
      shade[k] = Math.min(7, Math.abs(p.generation) + Math.floor(rng() * 2));
      color.push(colorOf(p.id));
    }
  }

  const trunkRadius = radii[1] ?? 0.4;
  return {
    height,
    totalChunks: tree.people.length,
    limbs: lines,
    trunkRadius,
    baseRadius: trunkRadius * 1.6,
    bark: {
      count: bark.pos.length / 3,
      pos: new Float32Array(bark.pos),
      normal: new Float32Array(bark.normal),
      uv: new Float32Array(bark.uv),
      index: new Uint32Array(bark.index),
    },
    foliage: { count, pos, scale, quat, shade, color },
    focal: home,
    focalName: name,
  };
}
