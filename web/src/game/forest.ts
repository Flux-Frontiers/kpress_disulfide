import { EXHIBITS, placeExhibits, type Exhibit } from "./exhibits";
import { indexCatalog, type ClassCatalog, type Molecule } from "./classCatalog";
import { homeTree, lineCard, lineGrown, speciesForGrove, type HomeTree, type LineCard } from "./classForest";
import { hubTree, lineTree } from "./classTree";
import { GROW_VERSION, cellKey3, emitBark, emitLeaves, type BarkBuffers, type GrownTree } from "./growTree";
import { sunflower, wheelLayout } from "./math";
import type { Junction } from "./roads";
import { groveNarration } from "./narration";
import { SPECIES } from "./species";

export const GENRE_PALETTE = [
  "#c45c4a",
  "#5b8fbf",
  "#4a9b6e",
  "#c48a3a",
  "#7a6ea8",
  "#3aa89a",
  "#c46b3a",
  "#b85a78",
  "#4aa8b8",
  "#8aa84a",
];

export type Grove = {
  genre: string;
  label: string;
  x: number;
  z: number;
  radius: number;
  color: string;
  bookCount: number;
  /** Bonds in the class family, and its share of the database. */
  count: number;
  percentage: number;
  /** "Allosteric", "Catalytic", or "": the signpost's function plate. */
  function: string;
  /** What the guided tour says here: a summary of the grove's books. */
  narration: string;
};

/**
 * A model disulfide standing in the orchard, ball-and-stick (molecule.ts):
 * a grove's representative on its stop plaza, or a tree's foot plate.
 */
export type MoleculeSite = {
  kind: "representative" | "plate";
  /** The grove (representative) or the line (plate) it stands for. */
  of: string;
  /** The molecule's center, m. */
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Metres per angstrom. */
  scale: number;
  /** The plinth's top, m: it stands from the ground to here. */
  plinth: number;
  model: Molecule;
};

export type TreeSite = {
  line: LineCard;
  x: number;
  z: number;
  height: number;
  /** The highest point of its wood, m: the crown's top. */
  top: number;
  trunkRadius: number;
  color: string;
  /** Index into SPECIES. */
  species: number;
  /** Index into forest.chunks (its grove). */
  chunk: number;
  /** Vertex range of this tree in forest.chunks[chunk].bark. */
  woodStart: number;
  woodCount: number;
  leafStart: number;
  leafCount: number;
};

export type RoadSeg = {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  kind: RoadLine["kind"];
};

export type Waypoint = {
  x: number;
  z: number;
  yaw: number;
  genre: string;
  label: string;
};

/** The hub: a paved plaza around the corpus redwood (the cart collides with its root flare). */
export const HUB_PLAZA_R = 10;
/** The inner ring road keeps at least this far from the hub's centre. */
const HUB_CLEAR = 18;
/** A ring road's centreline to the edge of the groves outside it; a grove's stop is on the ring. */
const GROVE_SETBACK = 1.4;
/** How far past the outermost groves an exhibit may stand, m. */
const EXHIBIT_ROOM = 30;
/** Least clear ground between two groves. */
const GROVE_GAP = 4;
/** A grove reaches this far past its widest crown, m, and is never smaller than GROVE_MIN_R. */
const GROVE_MARGIN = 3;
const GROVE_MIN_R = 5;
/** Least clear ground from a spoke's centreline to a grove it passes between. */
const SPOKE_LANE = 2;
/** Ring roads are sampled about this far apart. */
const ROAD_STEP = 2;
/** Spokes from the hub: four, reserved as lanes when the inner tier is seated (wheelLayout). */
const SPOKES = 4;
/**
 * The tour's turns where a spoke meets a ring are rounded with this radius;
 * the curb fillets there (roads.ts) keep the cart's wheels on the brick.
 */
const TOUR_TURN_R = 3.5;
/** A signpost keeps this far from a junction's crossing point, clear of its fillets. */
const SIGN_JUNCTION_CLEAR = 5;
/** Exhibit spurs keep this far from a junction (the old junction plaza, plus a verge). */
const JUNCTION_CLEAR = 12;
/** Bearing of the hub's monument and plaque from the hub; home looks back along it. */
export const HUB_PLAQUE_DIR = Math.atan2(4.6, -4.2);
/**
 * The home disulfide's monument stands beside the plaque's bearing, turned
 * this far from it, so the tour spoke that runs out behind home passes it;
 * the plaque stands on the bearing, between home and the hub tree.
 */
export const HUB_MONUMENT_DIST = 6.5;
const HUB_MONUMENT_TURN = 0.55;
export const HUB_PLAQUE_DIST = 9.6;
/** The monument: metres per angstrom, its plinth's height and the radius the cart keeps from it. */
export const MONUMENT_SCALE = 0.35;
export const MONUMENT_PLINTH = 0.8;
const MONUMENT_CLEAR = 1.6;
/** A grove's representative: metres per angstrom (about 2 m across), and its plinth. */
const REPRESENTATIVE_SCALE = 0.22;
const REPRESENTATIVE_PLINTH = 0.7;
/**
 * The representative stands at the hub side of its stop plaza, on a paved
 * pad of its own that overlaps the plaza's rim: this far from the stop, so
 * the cart on the ring keeps its 2.75 m from it, and away from the signpost,
 * which stands on the grove side.
 */
const REPRESENTATIVE_OFFSET = 3.7;
const REPRESENTATIVE_CLEAR = 0.9;
const REPRESENTATIVE_PAD = 1.2;
/** A tree's foot plate: its consensus model, small, beside the trunk on the stop's side. */
const PLATE_SCALE = 0.08;
const PLATE_PLINTH = 0.55;
const PLATE_GAP = 0.9;
// Home: 13 m out along the plaque's bearing, so the plaque and the monument
// stand between the cart and the hub tree; facing the hub (yaw convention of
// sim.yawToward).
const HOME = {
  x: Math.cos(HUB_PLAQUE_DIR) * 13,
  z: Math.sin(HUB_PLAQUE_DIR) * 13,
  yaw: Math.atan2(Math.cos(HUB_PLAQUE_DIR), Math.sin(HUB_PLAQUE_DIR)),
};

export type Chunk = {
  genre: string;
  species: number;
  x: number;
  z: number;
  /** Horizontal radius holding every trunk and crown. */
  radius: number;
  bark: { count: number; pos: Float32Array; normal: Float32Array; uv: Float32Array; index: Uint32Array };
  /** This grove's contiguous range in forest.leaves. */
  leafStart: number;
  leafCount: number;
};

/**
 * A road centreline in the ground plane; `closed` joins the last point to the
 * first. A spur is a short side spoke off a ring, out to an exhibit.
 */
export type RoadLine = { kind: "spoke" | "ring" | "spur"; pts: [number, number][]; closed: boolean };

/** Two binary classes one sign flip apart: an arc between their trees (none drawn yet). */
export type ForestLink = { family: string; a: number; b: number; married: string | null };

export type Forest = {
  trees: TreeSite[];
  /** Arcs between lines, by index into trees; empty until neighbor arcs are drawn. */
  links: ForestLink[];
  groves: Grove[];
  /** Straight pieces of every road line, for clearance tests. */
  roads: RoadSeg[];
  roadLines: RoadLine[];
  /** Paved discs: the hub, each grove's stop and each exhibit. */
  plazas: { x: number; z: number; r: number }[];
  /** Where each spoke crosses each ring; their curbs are rounded (roads.ts). */
  junctions: Junction[];
  /** One stop per grove, on its tier's ring, in the order the tour loop reaches them. */
  circuit: Waypoint[];
  /** Each grove's signpost: beside its stop, off the road on the grove's side, facing the road. */
  signs: { genre: string; x: number; z: number; yaw: number }[];
  /**
   * The guided tour's loop, sampled every ~2 m: round the inner ring, out along
   * the first spoke, round the outer ring, and back in. With one tier, the ring.
   */
  ringPath: Waypoint[];
  /**
   * One render chunk per grove: its bark mesh and its leaf range. A grove is one
   * genre and so one species; per-grove meshes let the renderer skip groves out
   * of view or lost in the fog instead of drawing the whole forest every frame.
   */
  chunks: Chunk[];
  leaves: {
    count: number;
    pos: Float32Array;
    scale: Float32Array;
    /** Leaf orientation quaternions (x, y, z, w). */
    quat: Float32Array;
    tint: Uint8Array;
    treeIndex: Uint16Array;
    species: Uint8Array;
  };
  /** Where the drive starts: home. */
  spawn: { x: number; z: number; yaw: number };
  /** On the hub plaza behind the redwood's plaque, facing the redwood. */
  home: { x: number; z: number; yaw: number };
  worldRadius: number;
  /** The database tree at the hub. */
  corpusTree: HomeTree;
  /**
   * The home disulfide's own line out on the rings: its tree (an index into
   * `trees`) and grove. Null when it is not a sampled member of a tree.
   */
  homeLine: { tree: number; genre: string } | null;
  /** The representatives on the stop plazas and the foot plates at the trees. */
  molecules: MoleculeSite[];
  /** Where the home disulfide's monument stands on the hub plaza. */
  monument: { x: number; z: number; yaw: number };
  /** Set pieces in roadside glades. */
  exhibits: Exhibit[];
  /** Discs the cart cannot drive into besides trunks: the redwood and each exhibit's plinth. */
  obstacles: { x: number; z: number; r: number }[];
  grid: Map<string, number[]>;
  cell: number;
};

let cached: Forest | null = null;
let cachedVersion = "";

function cellKey(cx: number, cz: number): string {
  return cx + ":" + cz;
}

/**
 * The orchard for a database, with one home disulfide; cached per database and home.
 *
 * :param catalog: As `proteusPy.export_web` wrote it.
 * :param home: The home disulfide's key.
 */
export function getForest(catalog: ClassCatalog, home: string): Forest {
  const key = `${GROW_VERSION}:${catalog.meta.generated}:${catalog.meta.database.bonds}:${home}`;
  if (cached && cachedVersion === key) return cached;
  cached = buildForest(catalog, home);
  cachedVersion = key;
  return cached;
}

/** Stand just outside a grove, facing its heart. */
export function groveApproach(g: Grove): Waypoint {
  const dist = Math.hypot(g.x, g.z) || 1;
  const ux = g.x / dist;
  const uz = g.z / dist;
  const stand = Math.max(7, dist - g.radius - GROVE_SETBACK);
  const x = ux * stand;
  const z = uz * stand;
  const yaw = Math.atan2(-ux, -uz);
  return { x, z, yaw, genre: g.genre, label: g.label };
}

export function groveByGenre(forest: Forest, genre: string): Grove | undefined {
  return forest.groves.find((g) => g.genre === genre);
}

/**
 * Whether (x, z) is at a grove's stop, on the ring road ahead of it. A jump
 * to the grove lands here, outside the grove's radius, so "inside the grove"
 * is the wrong test for having arrived.
 *
 * :param within: How near counts as there, m.
 */
export function atGroveStop(forest: Forest, genre: string, x: number, z: number, within = 9): boolean {
  const g = groveByGenre(forest, genre);
  if (!g) return false;
  const wp = groveApproach(g);
  return Math.hypot(wp.x - x, wp.z - z) < within;
}

/** Trunks in a grove stand at least this far apart, for driving room. */
const MIN_TRUNK_GAP = 7.5;
/** Clear air kept between neighbouring trees' wood (crown shyness). */
const CROWN_GAP = 0.6;
const WOOD_CELL = 2;

/**
 * Place a grove's trees as close to its heart as their wood allows: largest
 * crown first, each tree takes the innermost spot on a fine sunflower spiral
 * where its trunk keeps MIN_TRUNK_GAP and every branch keeps CROWN_GAP of air
 * from the trees already standing. Crowns may interleave (a small tree under a
 * big one's limbs) but never pass through each other. A lone tree stands at
 * the centre. Returns trunk offsets from the grove centre in `grown` order,
 * and how far the farthest crown reaches from the centre.
 */
function shyLayout(grown: GrownTree[], inner: number): { pts: { x: number; z: number }[]; extent: number } {
  const n = grown.length;
  const reach = grown.map(({ skeleton: { nodes, n: m } }) => {
    let r = 0;
    for (let k = 0; k < m; k++) r = Math.max(r, Math.hypot(nodes[k * 3]!, nodes[k * 3 + 2]!));
    return r;
  });
  if (n === 1) return { pts: [{ x: 0, z: 0 }], extent: reach[0]! };
  const order = [...Array(n).keys()].sort((a, b) => reach[b]! - reach[a]! || a - b);
  let cands = sunflower(n * 80 + 200, inner, 2).pts;
  const placed: { i: number; x: number; z: number }[] = [];
  // Placed wood as flat (x, y, z, padded radius) runs in a 3-D hash grid.
  const grid = new Map<number, number[]>();
  const key = (x: number, y: number, z: number) => cellKey3(Math.floor(x / WOOD_CELL), Math.floor(y / WOOD_CELL), Math.floor(z / WOOD_CELL));
  const pad = (i: number, k: number) => grown[i]!.skeleton.radii[k]! + 0.5 * grown[i]!.step;
  const out: { x: number; z: number }[] = new Array(n);

  const woodHits = (i: number, cx: number, cz: number, near: typeof placed) => {
    const { nodes, n: m } = grown[i]!.skeleton;
    for (let k = 0; k < m; k++) {
      const x = cx + nodes[k * 3]!, y = nodes[k * 3 + 1]!, z = cz + nodes[k * 3 + 2]!;
      // Only branches inside a neighbour's crown can touch it.
      if (!near.some((p) => Math.hypot(x - p.x, z - p.z) <= reach[p.i]! + WOOD_CELL)) continue;
      const pk = pad(i, k) + CROWN_GAP;
      const gx = Math.floor(x / WOOD_CELL), gy = Math.floor(y / WOOD_CELL), gz = Math.floor(z / WOOD_CELL);
      for (let a = gx - 1; a <= gx + 1; a++) for (let b = gy - 1; b <= gy + 1; b++) for (let c = gz - 1; c <= gz + 1; c++) {
        const cell = grid.get(cellKey3(a, b, c));
        if (!cell) continue;
        for (let q = 0; q < cell.length; q += 4) {
          if (Math.hypot(x - cell[q]!, y - cell[q + 1]!, z - cell[q + 2]!) < pk + cell[q + 3]!) return true;
        }
      }
    }
    return false;
  };

  for (const i of order) {
    // A spiral that runs out before a wide crown fits is extended; it is
    // prefix-stable, so every tree that already fit keeps its spot.
    for (let ci = 0; !out[i]; ci++) {
      if (ci === cands.length) cands = sunflower(cands.length * 2, inner, 2).pts;
      const c = cands[ci]!;
      if (placed.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < MIN_TRUNK_GAP)) continue;
      const near = placed.filter((p) => Math.hypot(p.x - c.x, p.z - c.z) < reach[i]! + reach[p.i]! + CROWN_GAP);
      if (near.length && woodHits(i, c.x, c.z, near)) continue;
      placed.push({ i, x: c.x, z: c.z });
      out[i] = c;
      const { nodes, n: m } = grown[i]!.skeleton;
      for (let k = 0; k < m; k++) {
        const x = c.x + nodes[k * 3]!, y = nodes[k * 3 + 1]!, z = c.z + nodes[k * 3 + 2]!;
        const kk = key(x, y, z);
        const cell = grid.get(kk);
        if (cell) cell.push(x, y, z, pad(i, k)); else grid.set(kk, [x, y, z, pad(i, k)]);
      }
      break;
    }
  }
  return { pts: out, extent: Math.max(0, ...out.map((p, i) => Math.hypot(p.x, p.z) + reach[i]!)) };
}

/** A signpost's centre from any road centreline: half the widest road (1.3 m), the cart (1.05 m), and a little. */
const SIGN_ROAD_CLEAR = 2.6;
/** From any trunk surface: the board is 3 m wide. */
const SIGN_TRUNK_CLEAR = 1.8;

function segDistance(x: number, z: number, s: RoadSeg): number {
  const dx = s.bx - s.ax, dz = s.bz - s.az;
  const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - s.ax - dx * t, z - s.az - dz * t);
}

/**
 * Round every sharp turn of a closed loop: the samples within `r` of the
 * corner give way to a quadratic curve from the point `r` before it to the
 * point `r` after, which never strays more than `r` from the corner. Stops
 * sit on the rings, well away from any turn, so they stay loop samples.
 */
function roundTurns(path: [number, number][], r: number): [number, number][] {
  const loop = path.filter((p, k) => {
    const q = path[(k - 1 + path.length) % path.length]!;
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6;
  });
  const n = loop.length;
  const out: [number, number][] = [];
  const skip = new Set<number>();
  const curves = new Map<number, [number, number][]>();
  for (let k = 0; k < n; k++) {
    const [px, pz] = loop[(k - 1 + n) % n]!, [cx, cz] = loop[k]!, [nx, nz] = loop[(k + 1) % n]!;
    const ux = cx - px, uz = cz - pz, vx = nx - cx, vz = nz - cz;
    const turn = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uz * vz) / ((Math.hypot(ux, uz) * Math.hypot(vx, vz)) || 1))));
    if (turn < 0.5) continue;
    const lu = Math.hypot(ux, uz) || 1, lv = Math.hypot(vx, vz) || 1;
    const a: [number, number] = [cx - (ux / lu) * r, cz - (uz / lu) * r];
    const b: [number, number] = [cx + (vx / lv) * r, cz + (vz / lv) * r];
    for (let j = 1; j < n / 2; j++) {
      const q = loop[(k - j + n) % n]!;
      if (Math.hypot(q[0] - cx, q[1] - cz) >= r) break;
      skip.add((k - j + n) % n);
    }
    for (let j = 1; j < n / 2; j++) {
      const q = loop[(k + j) % n]!;
      if (Math.hypot(q[0] - cx, q[1] - cz) >= r) break;
      skip.add((k + j) % n);
    }
    skip.add(k);
    const curve: [number, number][] = [];
    for (let s = 0; s <= 6; s++) {
      const t = s / 6;
      curve.push([(1 - t) ** 2 * a[0] + 2 * t * (1 - t) * cx + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * cz + t * t * b[1]]);
    }
    curves.set(k, curve);
  }
  for (let k = 0; k < n; k++) {
    if (curves.has(k)) out.push(...curves.get(k)!);
    else if (!skip.has(k)) out.push(loop[k]!);
  }
  return out.filter((p, k) => k === 0 || Math.hypot(p[0] - out[k - 1]![0], p[1] - out[k - 1]![1]) > 1e-6);
}

function buildForest(catalog: ClassCatalog, homeKey: string): Forest {
  const index = indexCatalog(catalog);
  // One grove per class family, holding each of its binary classes. Groves
  // are seated in order of occupancy, so the tour meets the most populous
  // first: the named families, then the unnamed classes, each by bond count.
  const byGenre = new Map(catalog.groves.filter((g) => g.lines.length).map((g) => [g.id, g]));
  const genres = [...byGenre.values()]
    .sort((a, b) => Number(b.named) - Number(a.named) || b.count - a.count || a.id.localeCompare(b.id))
    .map((g) => g.id);
  const booksBy = new Map(genres.map((g) => [g, byGenre.get(g)!.lines.map((id) => lineCard(index, index.line.get(id)!))]));
  // Trees packed as tight as their crowns allow (shyLayout); groves on a
  // hub-and-spoke wheel around the database tree (wheelLayout), seated in
  // occupancy order so the tour loop meets them most populous first.
  const bookInner = 6.5;
  const energy = (key: string) => index.energy.get(key);
  const grownBy = genres.map((g) => byGenre.get(g)!.lines.map((id) => lineGrown(lineTree(index, id), id, energy)));
  const layouts = grownBy.map((g) => shyLayout(g, bookInner));
  const groveRadius = (extent: number) => Math.max(GROVE_MIN_R, extent + GROVE_MARGIN);

  // The database tree, and a hub wide enough for its crown.
  const home = hubTree(index);
  const corpusTree = homeTree(home, homeKey, catalog.lines.length, `The ${catalog.meta.database.name} database`);
  let crownReach = 0;
  for (const person of home.people) if (person.y > 0) crownReach = Math.max(crownReach, Math.hypot(person.x, person.z));
  const hubPlazaR = HUB_PLAZA_R;
  const hubClear = Math.max(HUB_CLEAR, hubPlazaR + 8, crownReach + 6);
  const wheel = wheelLayout(layouts.map((l) => groveRadius(l.extent)), {
    hub: hubClear, setback: GROVE_SETBACK, gap: GROVE_GAP, lane: SPOKE_LANE, spokes: SPOKES,
  });
  // Turn the wheel so a spoke runs out behind home: the drive starts on the road.
  const turn = HUB_PLAQUE_DIR - (wheel.spokes[0] ?? HUB_PLAQUE_DIR);
  const cos = Math.cos(turn), sin = Math.sin(turn);
  const groveCenters = wheel.centers.map(({ x, z }) => ({ x: x * cos - z * sin, z: x * sin + z * cos }));
  wheel.spokes = wheel.spokes.map((a) => Math.atan2(Math.sin(a + turn), Math.cos(a + turn)));

  const groves: Grove[] = [];
  const trees: TreeSite[] = [];
  const chunks: Chunk[] = [];
  const leafSpecies: number[] = [];
  const leafPos: number[] = [];
  const leafScale: number[] = [];
  const leafTint: number[] = [];
  const leafQuat: number[] = [];
  const leafTree: number[] = [];

  genres.forEach((genre, gi) => {
    const books = booksBy.get(genre)!;
    const c = groveCenters[gi]!;
    const radius = groveRadius(layouts[gi]!.extent);
    const spots = layouts[gi]!.pts;
    const color = GENRE_PALETTE[gi % GENRE_PALETTE.length]!;
    const family = byGenre.get(genre)!;
    groves.push({
      genre,
      label: family.name,
      x: c.x,
      z: c.z,
      radius,
      color,
      bookCount: books.length,
      count: family.count,
      percentage: family.percentage,
      function: family.function,
      narration: groveNarration(family.name, books),
    });
    const species = speciesForGrove(genre);
    const bark: BarkBuffers = { pos: [], normal: [], uv: [], index: [] };
    const chunkLeafStart = leafPos.length / 3;

    books.forEach((line, bi) => {
      const s = spots[bi]!;
      const x = c.x + s.x;
      const z = c.z + s.z;
      const grown = grownBy[gi]![bi]!;
      const woodStart = bark.pos.length / 3;
      const woodCount = emitBark(grown, x, z, bark, SPECIES[species]!.barkAspect);
      const leafStart = leafPos.length / 3;
      const leafCount = emitLeaves(grown, x, z, leafPos, leafScale, leafTint, leafQuat, 0.22);
      const treeIndex = trees.length;
      for (let k = 0; k < leafCount; k++) {
        leafTree.push(treeIndex);
        leafSpecies.push(species);
      }
      trees.push({
        line,
        x,
        z,
        height: grown.trunkHeight,
        top: Math.max(...grown.skeleton.nodes.filter((_, k) => k % 3 === 1)),
        trunkRadius: Math.max(0.28, grown.trunkRadius),
        color,
        species,
        chunk: gi,
        woodStart,
        woodCount,
        leafStart,
        leafCount,
      });
    });
    chunks.push({
      genre,
      species,
      x: c.x,
      z: c.z,
      radius: radius + 6,
      bark: {
        count: bark.pos.length / 3,
        pos: new Float32Array(bark.pos),
        normal: new Float32Array(bark.normal),
        uv: new Float32Array(bark.uv),
        index: new Uint32Array(bark.index),
      },
      leafStart: chunkLeafStart,
      leafCount: leafPos.length / 3 - chunkLeafStart,
    });
  });

  const cell = 16;
  const grid = new Map<string, number[]>();
  trees.forEach((t, i) => {
    const cx = Math.floor(t.x / cell);
    const cz = Math.floor(t.z / cell);
    const k = cellKey(cx, cz);
    const arr = grid.get(k);
    if (arr) arr.push(i);
    else grid.set(k, [i]);
  });

  const orchardRadius = Math.max(80, wheel.outer);

  // Roads: a circular ring road per tier, each grove's stop on its tier's
  // ring at the grove's bearing, and straight spokes from the hub plaza out
  // to the last ring through the gaps in the inner tier.
  const stopsOf = wheel.rings.map((_, t) => groves
    .filter((_, gi) => wheel.tier[gi] === t)
    .map((g) => groveApproach(g))
    .sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x)));
  const tourSpoke = wheel.spokes[0] ?? 0;
  /** One lap of ring t from bearing `from`, counter-clockwise, with every stop and spoke as a sample. */
  const lap = (t: number, from: number): [number, number][] => {
    const R = wheel.rings[t]!;
    const turn = (a: number) => ((a - from) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const marks = [...stopsOf[t]!.map((wp) => Math.atan2(wp.z, wp.x)), ...wheel.spokes].map(turn);
    const steps = Math.ceil((2 * Math.PI * R) / ROAD_STEP);
    const at = [...new Set([...Array.from({ length: steps }, (_, k) => (2 * Math.PI * k) / steps), ...marks])]
      .sort((a, b) => a - b)
      .filter((a, k, arr) => k === 0 || marks.includes(a) || a - arr[k - 1]! > 0.25 / R);
    return at.map((a) => [R * Math.cos(from + a), R * Math.sin(from + a)] as [number, number]);
  };
  const spokeLine = (a: number, r0: number, r1: number): [number, number][] => {
    const steps = Math.max(1, Math.ceil(Math.abs(r1 - r0) / ROAD_STEP));
    return Array.from({ length: steps + 1 }, (_, k) => {
      const r = r0 + ((r1 - r0) * k) / steps;
      return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
    });
  };
  const lastRing = wheel.rings[wheel.rings.length - 1]!;
  const roadLines: RoadLine[] = wheel.spokes.map((a) => ({ kind: "spoke", pts: spokeLine(a, hubPlazaR - 1, lastRing), closed: false }));
  wheel.rings.forEach((_, t) => roadLines.push({ kind: "ring", pts: lap(t, tourSpoke), closed: true }));

  // The tour loop: each ring in turn, joined by the first spoke, out and back.
  const loop: [number, number][] = [];
  wheel.rings.forEach((R, t) => {
    loop.push(...lap(t, tourSpoke));
    if (t + 1 < wheel.rings.length) loop.push(...spokeLine(tourSpoke, R, wheel.rings[t + 1]!).slice(0, -1));
  });
  for (let t = wheel.rings.length - 1; t > 0; t--) loop.push(...spokeLine(tourSpoke, wheel.rings[t]!, wheel.rings[t - 1]!).slice(0, -1));
  const tourPts = roundTurns(loop, TOUR_TURN_R);
  // The stops in the order the loop reaches them, each landing on a loop sample.
  const stopIndex = new Map<Waypoint, number>();
  let from = 0;
  for (const tierStops of stopsOf) {
    for (const wp of [...tierStops].sort((a, b) => {
      const at = (w: Waypoint) => tourPts.findIndex((p, k) => k >= from && Math.hypot(p[0] - w.x, p[1] - w.z) < 1e-6);
      return at(a) - at(b);
    })) {
      const k = tourPts.findIndex((p, kk) => kk >= from && Math.hypot(p[0] - wp.x, p[1] - wp.z) < 1e-6);
      stopIndex.set(wp, k);
    }
    from = Math.max(...tierStops.map((wp) => stopIndex.get(wp)!));
  }
  const circuit = [...stopIndex.entries()].sort((a, b) => a[1] - b[1]).map(([wp]) => wp);

  // A stop's plaza: the representative on its hub side (Molecules.tsx) and a rim of brick.
  const STOP_R = 3.2;
  // Each exhibit at the end of a spur off a ring, clear of the stops' signposts and the junctions.
  const exhibits = placeExhibits({
    // Exhibits may stand in open ground just past the outermost groves.
    specs: EXHIBITS, roadLines, trees, worldRadius: orchardRadius + EXHIBIT_ROOM,
    avoid: [
      ...circuit.map((wp) => ({ x: wp.x, z: wp.z, r: STOP_R + 2 })),
      ...wheel.spokes.flatMap((a) => wheel.rings.map((R) => ({ x: R * Math.cos(a), z: R * Math.sin(a), r: JUNCTION_CLEAR }))),
    ],
  });
  for (const e of exhibits) roadLines.push({ kind: "spur", pts: e.spur, closed: false });
  const worldRadius = Math.max(orchardRadius, ...exhibits.map((e) => Math.hypot(e.x, e.z) + e.plazaR + 4));
  const roads: RoadSeg[] = [];
  for (const line of roadLines) {
    const n = line.pts.length;
    for (let i = 0; i < (line.closed ? n : n - 1); i++) {
      const [ax, az] = line.pts[i]!;
      const [bx, bz] = line.pts[(i + 1) % n]!;
      roads.push({ ax, az, bx, bz, kind: line.kind });
    }
  }
  const plazas = [
    { x: 0, z: 0, r: hubPlazaR },
    ...circuit.map((wp) => ({ x: wp.x, z: wp.z, r: STOP_R })),
    ...circuit.map((wp) => {
      const g = groves.find((gr) => gr.genre === wp.genre)!;
      const a = Math.atan2(g.z - wp.z, g.x - wp.x);
      return { x: wp.x - Math.cos(a) * REPRESENTATIVE_OFFSET, z: wp.z - Math.sin(a) * REPRESENTATIVE_OFFSET, r: REPRESENTATIVE_PAD };
    }),
    ...exhibits.map((e) => ({ x: e.x, z: e.z, r: e.plazaR })),
  ];
  const junctions: Junction[] = wheel.spokes.flatMap((a) => wheel.rings.map((R, t) => (
    { x: R * Math.cos(a), z: R * Math.sin(a), a, ring: R, through: t < wheel.rings.length - 1 })));
  // Each signpost stands just off its stop's plaza, clear of every road and
  // trunk, as near the grove's bearing as it can, facing back to the stop.
  const signs = circuit.map((wp) => {
    const g = groves.find((gr) => gr.genre === wp.genre)!;
    const toward = Math.atan2(g.z - wp.z, g.x - wp.x);
    for (let d = STOP_R + 1.5; d <= STOP_R + 9; d += 0.5) {
      let best: { x: number; z: number } | null = null;
      for (let k = 0; k < 36; k++) {
        const a = toward + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 18);
        const x = wp.x + Math.cos(a) * d, z = wp.z + Math.sin(a) * d;
        if (roads.every((r) => segDistance(x, z, r) >= SIGN_ROAD_CLEAR)
          && junctions.every((j) => Math.hypot(x - j.x, z - j.z) >= SIGN_JUNCTION_CLEAR)
          && trees.every((t) => Math.hypot(x - t.x, z - t.z) - t.trunkRadius >= SIGN_TRUNK_CLEAR)) {
          best = { x, z };
          break;
        }
      }
      if (best) return { genre: wp.genre, x: best.x, z: best.z, yaw: Math.atan2(wp.x - best.x, wp.z - best.z) };
    }
    return { genre: wp.genre, x: wp.x, z: wp.z, yaw: wp.yaw };
  });
  // Each loop sample carries the grove whose stop comes next, so the tour
  // lights the right signpost and trail.
  const nextGenre: string[] = new Array(tourPts.length);
  const stopAt = new Map([...stopIndex.entries()].map(([wp, k]) => [k, wp.genre]));
  let upcoming = circuit[0]!.genre;
  for (let pass = 0; pass < 2; pass++) {
    for (let k = tourPts.length - 1; k >= 0; k--) {
      upcoming = stopAt.get(k) ?? upcoming;
      nextGenre[k] = upcoming;
    }
  }
  const labelOf = new Map(groves.map((g) => [g.genre, g.label]));
  const ringPath: Waypoint[] = tourPts.map(([x, z], i) => {
    const [nx, nz] = tourPts[(i + 1) % tourPts.length]!;
    return { x, z, yaw: Math.atan2(-(nx - x), -(nz - z)), genre: nextGenre[i]!, label: labelOf.get(nextGenre[i]!)! };
  });

  const links: ForestLink[] = [];

  // The grove's representative, on the hub side of its stop plaza: the
  // consensus model of its most populous binary class. And at each tree's
  // foot, toward its stop, the tree's own consensus model as its name plate.
  const molecules: MoleculeSite[] = [];
  for (const wp of circuit) {
    const g = groves.find((gr) => gr.genre === wp.genre)!;
    const toward = Math.atan2(g.z - wp.z, g.x - wp.x);
    const model = index.line.get(byGenre.get(g.genre)!.lines[0]!)!.model;
    const lift = REPRESENTATIVE_PLINTH + moleculeExtent(model) * REPRESENTATIVE_SCALE;
    molecules.push({
      kind: "representative", of: g.genre, model, scale: REPRESENTATIVE_SCALE, plinth: REPRESENTATIVE_PLINTH,
      x: wp.x - Math.cos(toward) * REPRESENTATIVE_OFFSET, y: lift, z: wp.z - Math.sin(toward) * REPRESENTATIVE_OFFSET, yaw: toward,
    });
  }
  for (const t of trees) {
    const stop = circuit.find((wp) => wp.genre === groves[t.chunk]!.genre)!;
    const a = Math.atan2(stop.z - t.z, stop.x - t.x);
    const model = index.line.get(t.line.slug)!.model;
    const d = t.trunkRadius + PLATE_GAP;
    molecules.push({
      kind: "plate", of: t.line.slug, model, scale: PLATE_SCALE, plinth: PLATE_PLINTH,
      x: t.x + Math.cos(a) * d, y: PLATE_PLINTH + moleculeExtent(model) * PLATE_SCALE, z: t.z + Math.sin(a) * d, yaw: a,
    });
  }
  const monument = {
    x: Math.cos(HUB_PLAQUE_DIR + HUB_MONUMENT_TURN) * HUB_MONUMENT_DIST,
    z: Math.sin(HUB_PLAQUE_DIR + HUB_MONUMENT_TURN) * HUB_MONUMENT_DIST,
    yaw: HUB_PLAQUE_DIR,
  };

  return {
    trees,
    links,
    groves,
    roads,
    roadLines,
    plazas,
    junctions,
    circuit,
    signs,
    ringPath,
    chunks,
    leaves: {
      count: leafPos.length / 3,
      pos: new Float32Array(leafPos),
      scale: new Float32Array(leafScale),
      quat: new Float32Array(leafQuat),
      tint: Uint8Array.from(leafTint),
      treeIndex: Uint16Array.from(leafTree),
      species: Uint8Array.from(leafSpecies),
    },
    spawn: HOME,
    home: HOME,
    worldRadius: worldRadius + 18,
    corpusTree,
    homeLine: (() => {
      const own = index.memberOf.has(homeKey) ? index.lineOf.get(homeKey) : undefined;
      const tree = own ? trees.findIndex((t) => t.line.slug === own) : -1;
      return tree < 0 ? null : { tree, genre: groves[trees[tree]!.chunk]!.genre };
    })(),
    molecules,
    monument,
    exhibits,
    obstacles: [
      { x: 0, z: 0, r: corpusTree.baseRadius },
      { x: monument.x, z: monument.z, r: MONUMENT_CLEAR },
      ...molecules.filter((m) => m.kind === "representative").map((m) => ({ x: m.x, z: m.z, r: REPRESENTATIVE_CLEAR })),
      ...exhibits.map((e) => ({ x: e.x, z: e.z, r: e.obstacle })),
    ],
    grid,
    cell,
  };
}

/**
 * The first tree a ray hits, or null. Each tree is a pair of upright cylinders,
 * a trunk and a rough crown; a cylinder the ray starts inside is skipped, so a
 * crown overhanging the camera doesn't swallow every click.
 *
 * :param o: Ray origin (the camera).
 * :param d: Ray direction; need not be normalized, maxDist is in its units.
 * :param maxDist: Ignore hits farther than this, e.g. past the fog.
 */
export function pickTree(
  forest: Forest,
  o: { x: number; y: number; z: number },
  d: { x: number; y: number; z: number },
  maxDist: number,
): TreeSite | null {
  const a = d.x * d.x + d.z * d.z;
  if (a < 1e-9) return null;
  let best: TreeSite | null = null;
  let bestT = maxDist;
  const hit = (t: TreeSite, r: number, y0: number, y1: number) => {
    const fx = o.x - t.x;
    const fz = o.z - t.z;
    const c = fx * fx + fz * fz - r * r;
    if (c < 0) return;
    const b = fx * d.x + fz * d.z;
    const disc = b * b - a * c;
    if (disc < 0) return;
    const along = (-b - Math.sqrt(disc)) / a;
    if (along < 0 || along >= bestT) return;
    const y = o.y + d.y * along;
    if (y < y0 || y > y1) return;
    best = t;
    bestT = along;
  };
  for (const t of forest.trees) {
    hit(t, Math.max(0.6, t.trunkRadius * 1.6), 0, t.height);
    hit(t, Math.min(5, 1 + t.height * 0.2), t.height * 0.3, t.height * 1.05);
  }
  return best;
}

export function treesNear(forest: Forest, x: number, z: number, radius: number): TreeSite[] {
  const { grid, cell, trees } = forest;
  const r = radius;
  const minCx = Math.floor((x - r) / cell);
  const maxCx = Math.floor((x + r) / cell);
  const minCz = Math.floor((z - r) / cell);
  const maxCz = Math.floor((z + r) / cell);
  const out: TreeSite[] = [];
  const r2 = r * r;
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cz = minCz; cz <= maxCz; cz++) {
      const ids = grid.get(cellKey(cx, cz));
      if (!ids) continue;
      for (const i of ids) {
        const t = trees[i]!;
        const dx = t.x - x;
        const dz = t.z - z;
        if (dx * dx + dz * dz <= r2) out.push(t);
      }
    }
  }
  return out;
}

/**
 * Whether a line answers the lantern: its class ids with their suffixes, its
 * name and family, its function, or a sampled bond's key, which starts with
 * its PDB id. Every word must match somewhere ("lhspiral 22222o").
 */
export function lineMatchesQuery(line: LineCard, q: string): boolean {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => line.search.includes(w));
}

/** Matching trees, nearest to (x, z) first. */
export function searchTrees(forest: Pick<Forest, "trees">, q: string, x: number, z: number): TreeSite[] {
  return forest.trees
    .filter((t) => lineMatchesQuery(t.line, q))
    .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
}

/** Half a molecule's widest reach from its center, angstroms: how high above its plinth its center sits. */
export function moleculeExtent(model: Molecule): number {
  return Math.max(1, ...model.atoms.map((a) => Math.hypot(a.x, a.y, a.z)));
}

/** A pose a few metres from the tree on the side facing (fromX, fromZ), looking at the trunk. */
export function treeApproach(t: TreeSite, fromX: number, fromZ: number): { x: number; z: number; yaw: number } {
  const dx = fromX - t.x;
  const dz = fromZ - t.z;
  const d = Math.hypot(dx, dz) || 1;
  const stand = t.trunkRadius + 4.5; // Inside the 6.8 m read radius.
  const x = t.x + (dx / d) * stand;
  const z = t.z + (dz / d) * stand;
  return { x, z, yaw: Math.atan2(-(t.x - x), -(t.z - z)) };
}

export { seedFromKey } from "./math";
