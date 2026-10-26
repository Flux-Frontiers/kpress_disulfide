// What the reader (ClassReader.tsx) shows: a class card built from the
// catalog, and the pages of one tree in reading order. A bond's own card is
// fetched (classCatalog.loadBond); everything about a class is already in the
// catalog, so nothing here fetches.
//
// Pure, no React or three, so the tests can run it.

import type { BondCard, ClassIndex, Consensus, Molecule, Spread } from "./classCatalog";

export type ClassLevel = "binary" | "quadrant" | "octant" | "other";

/** A sampled member as a class card lists it. */
export type MemberRow = { key: string; energy: number; pdbId: string; rcsb: string };

/** One class: a binary class (a tree), a quadrant or octant class, or an `other` tip. */
export type ClassCardData = {
  id: string;
  level: ClassLevel;
  /** "-LHSpiral (00000b)", "Octant class 22222o", or "Octant classes folded under 11111q" for an other tip. */
  title: string;
  /** The binary class whose tree it is on. */
  line: string;
  /** The class family's name. */
  family: string;
  /** "Allosteric", "Catalytic", or "". */
  function: string;
  count: number;
  percentage: number;
  consensus?: Consensus;
  energy?: Spread;
  ca_distance?: Spread;
  /** Binary and octant classes: the model built from the consensus torsions. */
  model?: Molecule;
  /** The class one tier up; null for a binary class. */
  parent: string | null;
  /** The classes one tier down, most populous first. */
  children: string[];
  /** Octant classes: the sampled members, lowest energy first. */
  members: MemberRow[];
  /** Other tips: the octant classes folded in, and their counts. */
  folded: { id: string; count: number }[];
};

/** A page of the reader: a class, or one sampled bond. `depth` is its tier below the trunk. */
export type ReaderPage = { id: string; kind: "class" | "bond"; depth: number };

const LEVEL_NAME: Record<ClassLevel, string> = {
  binary: "Binary class",
  quadrant: "Quadrant class",
  octant: "Octant class",
  other: "Folded octant classes",
};

/** "Binary class", "Quadrant class", "Octant class", "Folded octant classes". */
export function levelName(level: ClassLevel): string {
  return LEVEL_NAME[level];
}

/** A PDB entry's page at the RCSB, from a bond key (`1xr9_203A_259A`) or a PDB id. */
export function rcsbUrl(key: string): string {
  return `https://www.rcsb.org/structure/${key.split("_")[0]!.toUpperCase()}`;
}

/** "1XR9 203A-259A": a bond as the monument's plaque and the reader name it. */
export function bondName(bond: Pick<BondCard, "pdb_id" | "proximal" | "proximal_chain" | "distal" | "distal_chain">): string {
  return `${bond.pdb_id.toUpperCase()} ${bond.proximal}${bond.proximal_chain}-${bond.distal}${bond.distal_chain}`;
}

/**
 * The card for one class.
 *
 * :param index: The indexed catalog.
 * :param id: A class id with its suffix (`00000b`, `11111q`, `22222o`, `11111q-other`).
 * :returns: The card, or null for an id the catalog does not hold.
 */
export function classCard(index: ClassIndex, id: string): ClassCardData | null {
  const line = index.line.get(id);
  if (line) {
    const grove = index.grove.get(line.grove);
    return {
      id,
      level: "binary",
      title: line.name === line.id ? line.id : `${line.name} (${line.id})`,
      line: line.id,
      family: grove?.name ?? line.grove,
      function: line.function,
      count: line.count,
      percentage: line.percentage,
      consensus: line.consensus,
      energy: line.energy,
      ca_distance: line.ca_distance,
      model: line.model,
      parent: null,
      children: index.children.get(id) ?? [],
      members: [],
      folded: [],
    };
  }
  const c = index.cls.get(id);
  if (!c) return null;
  const owner = index.line.get(c.line);
  const grove = owner ? index.grove.get(owner.grove) : undefined;
  return {
    id,
    level: c.level,
    title: c.level === "other" ? `Octant classes folded under ${c.parent}` : `${LEVEL_NAME[c.level]} ${id}`,
    line: c.line,
    family: grove?.name ?? owner?.grove ?? "",
    function: owner?.function ?? "",
    count: c.count,
    percentage: c.percentage,
    consensus: c.consensus,
    energy: c.energy,
    ca_distance: c.ca_distance,
    model: c.model,
    parent: c.parent,
    children: index.children.get(id) ?? [],
    members: (c.members ?? []).map((m) => ({ key: m.key, energy: m.energy, pdbId: m.key.split("_")[0]!, rcsb: rcsbUrl(m.key) })),
    folded: c.folded ?? [],
  };
}

/**
 * Every page of one tree in reading order: the binary class, then each
 * quadrant class followed by its octant classes and other tip, each octant
 * class followed by its sampled bonds.
 *
 * :param index: The indexed catalog.
 * :param line: The binary class id.
 */
export function readerPages(index: ClassIndex, line: string): ReaderPage[] {
  const out: ReaderPage[] = [];
  const walk = (id: string, depth: number) => {
    out.push({ id, kind: "class", depth });
    for (const m of index.cls.get(id)?.members ?? []) out.push({ id: m.key, kind: "bond", depth: depth + 1 });
    for (const child of index.children.get(id) ?? []) walk(child, depth + 1);
  };
  if (index.line.has(line)) walk(line, 0);
  return out;
}

/** The ancestry of a class or sampled bond, trunk first: `00000b`, `11111q`, `22222o`, then the bond. */
export function trail(index: ClassIndex, id: string): string[] {
  const out: string[] = [];
  let at: string | undefined = id;
  if (index.memberOf.has(id)) {
    out.push(id);
    at = index.memberOf.get(id);
  }
  while (at) {
    out.unshift(at);
    at = index.cls.get(at)?.parent;
  }
  return out;
}

/** "-74.5° ± 35.3": a mean angle and its spread. */
export function angleSpread(mean: number, std: number): string {
  return `${mean.toFixed(1)}° ± ${std.toFixed(1)}`;
}
