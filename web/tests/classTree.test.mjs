// The class layout against the trimmed subset export (orchard.mjs): the wood
// is binary > quadrant > octant > members, and every limb runs from a class
// to the class one tier down.
import { SUBSET } from "./orchard.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const build = process.env.FOREST_TEST_BUILD;
const { indexCatalog, chooseForest } = require(`${build}/classCatalog.js`);
const { lineTree, hubTree, HUB_ROOT, EDGE_SUBDIVISIONS } = require(`${build}/classTree.js`);
const { lineGrown, energyTint, ENERGY_STEPS, LEAVES_PER_PERSON, lineCard } = require(`${build}/classForest.js`);

const index = indexCatalog(SUBSET);

/** The node a wood path from `node` toward the ground reaches first. */
function nodeBelow(tree, node) {
  const byNode = new Map(tree.people.map((p) => [p.node, p.id]));
  for (let i = tree.skeleton.parents[node]; i >= 0; i = tree.skeleton.parents[i]) {
    if (byNode.has(i)) return byNode.get(i);
  }
  return null;
}

/** The class a node hangs from: a member's octant class, a class's parent. */
const parentOf = (id) => index.memberOf.get(id) ?? index.cls.get(id)?.parent ?? null;

/** Quadrant digit for an octant digit, and binary digit for a quadrant digit. */
const quadDigit = (d) => 4 - Math.floor((8 - d) / 2);
const binDigit = (d) => (d >= 3 ? 2 : 0);

test("the tiers nest by digit: an octant's quadrant and binary classes are its digits coarsened", () => {
  for (const c of SUBSET.classes) {
    if (c.level === "quadrant") {
      assert.equal(c.parent, [...c.id.slice(0, 5)].map((d) => binDigit(Number(d))).join("") + "b", c.id);
    } else {
      const q = index.cls.get(c.parent);
      assert.equal(q.level, "quadrant", c.id);
      const octs = c.level === "octant" ? [c.id] : c.folded.map((f) => f.id);
      for (const o of octs) {
        assert.equal([...o.slice(0, 5)].map((d) => quadDigit(Number(d))).join("") + "q", c.parent, o);
      }
    }
    assert.equal(index.lineOf.get(c.id), c.line);
  }
});

test("counts sum down every limb, and every id carries its suffix", () => {
  const total = SUBSET.lines.reduce((a, l) => a + l.count, 0);
  assert.equal(total, SUBSET.meta.database.bonds);
  for (const l of SUBSET.lines) {
    assert.match(l.id, /^[02]{5}b$/);
    assert.equal((index.children.get(l.id) ?? []).reduce((a, id) => a + index.cls.get(id).count, 0), l.count, l.id);
  }
  for (const c of SUBSET.classes) {
    assert.match(c.id, /^(\d{5}[qo]|[1-4]{5}q-other)$/);
    if (c.level === "quadrant") {
      assert.equal(index.children.get(c.id).reduce((a, id) => a + index.cls.get(id).count, 0), c.count, c.id);
    }
  }
});

test("every class's and member's wood runs down to its parent class, and the trunk to the ground", () => {
  for (const line of SUBSET.lines) {
    const tree = lineTree(index, line.id);
    assert.equal(tree.skipped, 0, line.id);
    for (const p of tree.people) {
      const below = nodeBelow(tree, p.node);
      if (p.id === line.id) assert.equal(below, null, "the trunk rises from the ground");
      else assert.equal(below, parentOf(p.id), `${line.id}: ${p.id} grows from ${below}`);
    }
  }
  const hub = hubTree(index);
  assert.equal(hub.skipped, 0);
  for (const p of hub.people) {
    const below = nodeBelow(hub, p.node);
    if (p.id === HUB_ROOT) assert.equal(below, null);
    else if (index.line.has(p.id)) assert.equal(below, HUB_ROOT, p.id);
    else assert.equal(below, parentOf(p.id), p.id);
  }
});

test("a line tree holds its own classes and sampled members once each, and nothing else", () => {
  for (const line of SUBSET.lines) {
    const tree = lineTree(index, line.id);
    const ids = tree.people.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, `${line.id}: a node placed twice`);
    const classes = SUBSET.classes.filter((c) => c.line === line.id);
    const members = classes.flatMap((c) => c.members ?? []).map((m) => m.key);
    assert.deepEqual(ids.sort(), [line.id, ...classes.map((c) => c.id), ...members].sort());
    for (const p of tree.people) {
      const tier = p.id === line.id ? 0 : p.member ? 3 : index.cls.get(p.id).level === "quadrant" ? 1 : 2;
      assert.equal(p.generation, tier, p.id);
      assert.equal(p.marriedIn, false);
    }
  }
});

test("the database tree: every bond at the trunk, binary, quadrant and octant tiers, no members", () => {
  const hub = hubTree(index);
  const tiers = new Map();
  for (const p of hub.people) tiers.set(p.generation, (tiers.get(p.generation) ?? 0) + 1);
  assert.equal(tiers.get(0), 1);
  assert.equal(tiers.get(1), SUBSET.lines.length);
  assert.equal(tiers.get(2), SUBSET.classes.filter((c) => c.level === "quadrant").length);
  assert.equal(tiers.get(3), SUBSET.classes.filter((c) => c.level !== "quadrant").length);
  assert.ok(!hub.people.some((p) => p.member));
  // Taller and thicker than any line tree.
  const top = (t) => Math.max(...t.people.map((p) => p.y));
  const biggest = Math.max(...SUBSET.lines.map((l) => top(lineTree(index, l.id))));
  assert.ok(top(hub) > biggest, `hub ${top(hub)} m vs ${biggest} m`);
});

test("limbs are as thick as the bonds they carry", () => {
  const trunkR = (t) => t.skeleton.radii[1];
  const lines = [...SUBSET.lines].sort((a, b) => b.count - a.count);
  const big = lineTree(index, lines[0].id), small = lineTree(index, lines[lines.length - 1].id);
  assert.ok(trunkR(big) > trunkR(small), `${lines[0].id} ${trunkR(big)} vs ${lines.at(-1).id} ${trunkR(small)}`);
  // Within a tree, a quadrant class with more bonds is no thinner than a sibling with fewer.
  const tree = lineTree(index, lines[0].id);
  const quads = tree.people.filter((p) => p.generation === 1).map((p) => ({ r: tree.skeleton.radii[p.node], n: index.cls.get(p.id).count }));
  quads.sort((a, b) => b.n - a.n);
  for (let k = 1; k < quads.length; k++) if (quads[k].n < quads[k - 1].n) assert.ok(quads[k].r <= quads[k - 1].r + 1e-6);
  // Each class edge is subdivided into a curve.
  assert.ok(tree.skeleton.n >= 1 + tree.people.length * (EDGE_SUBDIVISIONS + 1));
});

test("a member's leaves are tinted by its energy: cool when relaxed, warm when strained", () => {
  assert.equal(energyTint(0.4), 0);
  assert.equal(energyTint(ENERGY_STEPS[0]), 1);
  assert.equal(energyTint(50), ENERGY_STEPS.length);
  assert.ok(ENERGY_STEPS.length <= 7, "tints fit 0-7");
  const line = SUBSET.lines[0];
  const tree = lineTree(index, line.id);
  const g = lineGrown(tree, line.id, (k) => index.energy.get(k));
  const members = tree.people.filter((p) => p.member);
  assert.equal(g.nLeaves, members.length * LEAVES_PER_PERSON);
  members.forEach((m, i) => {
    assert.equal(g.leafTint[i * LEAVES_PER_PERSON], energyTint(index.energy.get(m.id)), m.id);
  });
});

test("a line's card names its class with the suffix and finds its members", () => {
  const line = SUBSET.lines.find((l) => l.id === "00200b");
  const card = lineCard(index, line);
  assert.equal(card.title, "-RHStaple (00200b)");
  assert.equal(card.surname, "RHStaple");
  assert.equal(card.members, line.count);
  assert.ok(card.summary.includes("Allosteric"));
  for (const key of card.people) assert.ok(card.search.includes(key.toLowerCase()));
});

test("the database shown: the URL's, else the last chosen, else the first", () => {
  const forests = [{ slug: "subset" }, { slug: "full" }];
  assert.equal(chooseForest(forests, "full", "subset").slug, "full");
  assert.equal(chooseForest(forests, "nothing", "full").slug, "full");
  assert.equal(chooseForest(forests, null, null).slug, "subset");
});
