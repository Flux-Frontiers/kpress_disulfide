// The disulfide database as proteusPy's web export writes it
// (`proteusPy.export_web`): catalog.json, atoms.json, classes/<id>.json and
// bonds/<key>.json, under public/forests/<slug>/. Loaded at runtime, never
// compiled in; only the trimmed test fixture is committed.
//
// The class hierarchy is binary > quadrant > octant > members, three tiers
// that partition each other exactly. Every class id carries its level's
// suffix: `22222b`, `2222q` with its q, `22222o`; an octant class too sparse
// for its own tip is folded into `<quadrant id>-other`.

/** The export format this build reads. proteusPy bumps it on a breaking change. */
export const FOREST_FORMAT = 1;

export type Atom = { name: string; element: string; x: number; y: number; z: number };

/** A ball-and-stick model: atoms centered on their centroid, in angstroms, and bonds as index pairs. */
export type Molecule = { atoms: Atom[]; bonds: [number, number][] };

export type Spread = { mean: number; std: number };

/** Circular mean and spread of chi1..chi5, degrees. */
export type Consensus = { chi: number[]; std: number[] };

/** A class family: a named family's sign variants, or one unnamed binary class. */
export type ClassGrove = {
  /** `lhspiral`, or `b-00002` for an unnamed class. */
  id: string;
  name: string;
  /** "Allosteric", "Catalytic", or "". */
  function: string;
  /** Its binary classes, most populous first. */
  lines: string[];
  count: number;
  percentage: number;
  named: boolean;
};

/** A binary class: one tree. */
export type ClassLine = {
  id: string;
  name: string;
  grove: string;
  function: string;
  count: number;
  percentage: number;
  consensus?: Consensus;
  energy?: Spread;
  ca_distance?: Spread;
  model: Molecule;
};

export type Member = { key: string; energy: number };

/** A quadrant or octant class, or an `other` tip of folded octant classes. */
export type ClassNode = {
  id: string;
  level: "quadrant" | "octant" | "other";
  /** The class one tier up: a binary class for a quadrant, a quadrant for the rest. */
  parent: string;
  line: string;
  count: number;
  percentage: number;
  consensus?: Consensus;
  energy?: Spread;
  ca_distance?: Spread;
  /** Octant classes: the consensus model. */
  model?: Molecule;
  /** Octant classes: the sampled members, lowest energy first. */
  members?: Member[];
  /** Other tips: the folded octant classes and their counts. */
  folded?: { id: string; count: number }[];
};

export type ClassCatalog = {
  meta: {
    format: number;
    generator: string;
    generated: string;
    database: { name: string; bonds: number; pdb_entries: number };
    min_members: number;
    members_per_class: number;
    counts: Record<string, number>;
  };
  groves: ClassGrove[];
  lines: ClassLine[];
  classes: ClassNode[];
  /** The default home disulfide: the database's lowest-energy bond. */
  home: string;
};

/** atoms.json: proteusPy's rendering tables (DisulfideVisualization._render_ss). */
export type AtomsTable = {
  order: string[];
  elements: string[];
  colors: Record<string, string>;
  radii: Record<string, number>;
  bs_scale: number;
  bond_radius: number;
  bond_color: string;
  bonds_full: [number, number][];
  bonds_model: [number, number][];
};

/** bonds/<key>.json: one real disulfide. */
export type BondCard = Molecule & {
  key: string;
  pdb_id: string;
  proximal: number;
  distal: number;
  proximal_chain: string;
  distal_chain: string;
  resolution: number;
  torsions: number[];
  energy: number;
  ca_distance: number;
  sg_distance: number;
  classes: { binary: string; quadrant: string; octant: string };
  rcsb: string;
};

/** The catalog's hierarchy, indexed for walking. */
export type ClassIndex = {
  catalog: ClassCatalog;
  grove: Map<string, ClassGrove>;
  line: Map<string, ClassLine>;
  cls: Map<string, ClassNode>;
  /** Class id -> its child classes, in catalog order (most populous first). */
  children: Map<string, string[]>;
  /** Class id or member key -> the binary class whose tree it is on. */
  lineOf: Map<string, string>;
  /** Member key -> its octant class. */
  memberOf: Map<string, string>;
  /** Member key -> its torsional energy, kcal/mol. */
  energy: Map<string, number>;
};

/**
 * Index a catalog for the tree walks.
 *
 * :param catalog: As loaded.
 * :returns: Lookups by id, children by parent, and each class's and member's line.
 */
export function indexCatalog(catalog: ClassCatalog): ClassIndex {
  const grove = new Map(catalog.groves.map((g) => [g.id, g]));
  const line = new Map(catalog.lines.map((l) => [l.id, l]));
  const cls = new Map(catalog.classes.map((c) => [c.id, c]));
  const children = new Map<string, string[]>();
  const lineOf = new Map<string, string>();
  const memberOf = new Map<string, string>();
  const energy = new Map<string, number>();
  for (const l of catalog.lines) lineOf.set(l.id, l.id);
  for (const c of catalog.classes) {
    const list = children.get(c.parent);
    if (list) list.push(c.id);
    else children.set(c.parent, [c.id]);
    lineOf.set(c.id, c.line);
    for (const m of c.members ?? []) {
      memberOf.set(m.key, c.id);
      lineOf.set(m.key, c.line);
      energy.set(m.key, m.energy);
    }
  }
  return { catalog, grove, line, cls, children, lineOf, memberOf, energy };
}

/**
 * Fetch a database exported by `proteusPy.export_web`.
 *
 * :param base: The directory URL holding catalog.json, with a trailing slash.
 * :throws: On a missing file or an export format this build does not read.
 */
export async function loadForestCatalog(base: string): Promise<ClassCatalog> {
  const res = await fetch(`${base}catalog.json`);
  if (!res.ok) throw new Error(`no database at ${base}catalog.json (${res.status}); run make forest`);
  const catalog = (await res.json()) as ClassCatalog;
  if (catalog.meta?.format !== FOREST_FORMAT) {
    throw new Error(`catalog.json is export format ${catalog.meta?.format}; this build reads ${FOREST_FORMAT}`);
  }
  return catalog;
}

/** Fetch atoms.json, the colors, radii and bond tables. */
export async function loadAtoms(base: string): Promise<AtomsTable> {
  const res = await fetch(`${base}atoms.json`);
  if (!res.ok) throw new Error(`no atoms.json at ${base} (${res.status})`);
  return (await res.json()) as AtomsTable;
}

/** Fetch one bond's card. */
export async function loadBond(base: string, key: string): Promise<BondCard> {
  const res = await fetch(`${base}bonds/${encodeURIComponent(key)}.json`);
  if (!res.ok) throw new Error(`no bond card for ${key} (${res.status})`);
  return (await res.json()) as BondCard;
}

/** One database the app can show: a folder under public/forests (scripts/forests.mjs). */
export type ForestEntry = {
  slug: string;
  title: string;
  bonds: number;
  lines: number;
  /** The disulfide the monument opens on (`make forest FOREST_HOME=`), if one was named. */
  home?: string;
};

/**
 * Fetch the list of exported databases.
 *
 * :param root: The app's base URL, with a trailing slash.
 * :returns: The databases, or null when there is no index.
 */
export async function loadForestIndex(root: string): Promise<ForestEntry[] | null> {
  const res = await fetch(`${root}forests/index.json`);
  if (!res.ok) return null;
  const index = (await res.json()) as { forests?: ForestEntry[] };
  return Array.isArray(index.forests) && index.forests.length ? index.forests : null;
}

/** The database to show: the one asked for in the URL, else the last one chosen, else the first. */
export function chooseForest(forests: readonly ForestEntry[], asked: string | null, saved: string | null): ForestEntry {
  return forests.find((f) => f.slug === asked) ?? forests.find((f) => f.slug === saved) ?? forests[0]!;
}
