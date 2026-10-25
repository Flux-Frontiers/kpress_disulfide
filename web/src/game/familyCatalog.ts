// The Family's export types, kept only for the record reader (FamilyReader.tsx)
// until it is rewritten for class and bond cards. The orchard reads the
// disulfide database (classCatalog.ts).

/** The export format this build reads. genealogy_kg bumps it on a breaking change. */
export const FAMILY_FORMAT = 1;

export type FamilyPerson = {
  id: string;
  name: string;
  surname: string | null;
  sex: string | null;
  born: string | null;
  died: string | null;
  birth_place: string | null;
  line: string;
  /** Redacted: named "Living", with no dates, places or record. */
  living: boolean;
};

export type FamilyUnit = { id: string; spouses: string[]; children: string[]; married: string | null };

export type FamilyLine = {
  id: string;
  surname: string;
  grove: string;
  /** The founder first, then the founder's spouses. */
  founders: string[];
  /** Everyone born into the line, founder first. */
  members: string[];
  span: [string, string] | null;
};

/** A marriage between two lines: a road between their trees. */
export type FamilyLink = { family: string; lines: string[]; spouses: string[]; married: string | null };

export type FamilyPlace = { id: string; name: string; within: string | null; events: number };

export type FamilyCatalog = {
  meta: {
    format: number;
    generator: string;
    generated: string;
    sources: string[];
    privacy: { living_cutoff_years: number | null; unknown_birth_policy: string; include_living: boolean };
    counts: Record<string, number>;
  };
  lines: FamilyLine[];
  people: FamilyPerson[];
  families: FamilyUnit[];
  links: FamilyLink[];
  places: FamilyPlace[];
};

export type FamilyEvent = { type: string | null; label: string; date: string | null; place: string | null };

/** people/<id>.json: the record reader's page. */
export type PersonPage = {
  id: string;
  name: string;
  sex: string | null;
  line: string;
  living: boolean;
  summary: string | null;
  events: FamilyEvent[];
  parents: string[];
  spouses: { id: string; family: string }[];
  children: string[];
  record: { file: string; start: number; end: number; lines: string[] } | null;
};

/**
 * Fetch a family exported by `genkg export-web`.
 *
 * :param base: The directory URL holding catalog.json, with a trailing slash.
 * :throws: On a missing file or an export format this build does not read.
 */
const ROMAN = /^(?=[MDCLXVI])M*(C[MD]|D?C{0,3})(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$/;

/**
 * A name as people write it: a word in capitals, the old GEDCOM way of
 * marking a surname ("John Fitzgerald KENNEDY", "WASHINGTON"), in title case.
 * Roman numerals ("Henry VIII") and single letters are left alone.
 */
export function tidyName(name: string): string {
  return name.replace(/[A-Z][A-Z'-]+/g, (w) => {
    if (ROMAN.test(w)) return w;
    // "O'BRIEN-SMITH" -> "O'Brien-Smith": capitals after an apostrophe or hyphen stay.
    return w[0] + w.slice(1).toLowerCase().replace(/([-'])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
  });
}

export async function loadFamilyCatalog(base: string): Promise<FamilyCatalog> {
  const res = await fetch(`${base}catalog.json`);
  if (!res.ok) throw new Error(`no family at ${base}catalog.json (${res.status}); run make family`);
  const catalog = (await res.json()) as FamilyCatalog;
  if (catalog.meta?.format !== FAMILY_FORMAT) {
    throw new Error(`catalog.json is export format ${catalog.meta?.format}; this build reads ${FAMILY_FORMAT}`);
  }
  for (const p of catalog.people) {
    p.name = tidyName(p.name);
    if (p.surname) p.surname = tidyName(p.surname);
  }
  for (const l of catalog.lines) l.surname = tidyName(l.surname);
  return catalog;
}

/** Fetch one person's page for the record reader. */
export async function loadPersonPage(base: string, id: string): Promise<PersonPage> {
  const res = await fetch(`${base}people/${encodeURIComponent(id)}.json`);
  if (!res.ok) throw new Error(`no page for ${id} (${res.status})`);
  const page = (await res.json()) as PersonPage;
  page.name = tidyName(page.name);
  return page;
}
