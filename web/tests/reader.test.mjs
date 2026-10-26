// The reader's pages and cards against the trimmed subset export (orchard.mjs).
import { HOME_BOND, SUBSET } from "./orchard.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const build = process.env.FOREST_TEST_BUILD;
const { indexCatalog } = require(`${build}/classCatalog.js`);
const { angleSpread, bondName, classCard, rcsbUrl, readerPages, trail } = require(`${build}/classCards.js`);

const index = indexCatalog(SUBSET);

test("a tree's pages are its every class and sampled bond, each after its parent", () => {
  for (const line of SUBSET.lines) {
    const pages = readerPages(index, line.id);
    assert.equal(pages[0].id, line.id);
    assert.equal(pages[0].depth, 0);
    const classes = SUBSET.classes.filter((c) => c.line === line.id);
    const members = classes.flatMap((c) => c.members ?? []);
    assert.equal(pages.length, 1 + classes.length + members.length, line.id);
    assert.equal(new Set(pages.map((p) => p.id)).size, pages.length, `${line.id}: no page twice`);
    const seen = new Set();
    for (const p of pages) {
      const parent = p.kind === "bond" ? index.memberOf.get(p.id) : index.cls.get(p.id)?.parent;
      if (p.depth > 0) assert.ok(seen.has(parent), `${p.id} after ${parent}`);
      assert.equal(p.kind === "bond", index.memberOf.has(p.id), p.id);
      seen.add(p.id);
    }
  }
  assert.deepEqual(readerPages(index, "not-a-class"), []);
});

test("a binary class's card is its tree's trunk: no parent, its quadrant classes as children", () => {
  const line = SUBSET.lines[0];
  const card = classCard(index, line.id);
  assert.equal(card.level, "binary");
  assert.equal(card.title, `${line.name} (${line.id})`);
  assert.equal(card.parent, null);
  assert.equal(card.family, SUBSET.groves.find((g) => g.id === line.grove).name);
  assert.ok(card.children.length > 0);
  for (const id of card.children) assert.equal(index.cls.get(id).level, "quadrant", id);
  assert.equal(card.model.atoms.length, 10, "a model built from torsions has no carbonyl O");
  assert.equal(card.consensus.chi.length, 5);
});

test("an octant class's card lists its sampled bonds with RCSB links; an other tip its folded classes", () => {
  const octant = SUBSET.classes.find((c) => c.level === "octant" && c.members?.length);
  const card = classCard(index, octant.id);
  assert.equal(card.title, `Octant class ${octant.id}`);
  assert.equal(card.parent, octant.parent);
  assert.deepEqual(card.members.map((m) => m.key), octant.members.map((m) => m.key));
  for (const m of card.members) {
    assert.equal(m.rcsb, `https://www.rcsb.org/structure/${m.key.split("_")[0].toUpperCase()}`);
    assert.equal(m.pdbId, m.key.split("_")[0]);
  }
  const other = SUBSET.classes.find((c) => c.level === "other");
  const tip = classCard(index, other.id);
  assert.equal(tip.level, "other");
  assert.equal(tip.title, `Octant classes folded under ${other.parent}`);
  assert.deepEqual(tip.folded, other.folded);
  assert.equal(tip.model, undefined);
  assert.equal(classCard(index, "22222"), null, "an id without its suffix names no class");
});

test("a bond's trail runs from its binary class to itself, and names it as the plaque does", () => {
  const key = HOME_BOND.key;
  assert.deepEqual(trail(index, key), [HOME_BOND.classes.binary, HOME_BOND.classes.quadrant, HOME_BOND.classes.octant, key]);
  assert.deepEqual(trail(index, HOME_BOND.classes.quadrant), [HOME_BOND.classes.binary, HOME_BOND.classes.quadrant]);
  assert.deepEqual(trail(index, HOME_BOND.classes.binary), [HOME_BOND.classes.binary]);
  assert.equal(bondName(HOME_BOND), "1XR9 203A-259A");
  assert.equal(rcsbUrl(key), HOME_BOND.rcsb);
  assert.equal(angleSpread(-74.49, 35.27), "-74.5° ± 35.3");
});
