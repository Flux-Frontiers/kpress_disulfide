import { orchardArgs } from "./orchard.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
globalThis.window ??= { localStorage: { getItem: () => null, setItem() {} } };
const build = process.env.FOREST_TEST_BUILD;

test("the forest knows the home disulfide's own class, its tree and its grove", () => {
  const { getForest } = require(`${build}/forest.js`);
  const { indexCatalog } = require(`${build}/classCatalog.js`);
  const [catalog, focal] = orchardArgs();
  const f = getForest(catalog, focal);
  const own = indexCatalog(catalog).lineOf.get(focal);
  assert.ok(f.homeLine, "no home line");
  assert.equal(f.trees[f.homeLine.tree].line.slug, own);
  assert.equal(f.groves[f.trees[f.homeLine.tree].chunk].genre, f.homeLine.genre);
});

test("the gilded wood runs from the ground up the skeleton to the home disulfide, and the schematic's to its bead", () => {
  const { getForest } = require(`${build}/forest.js`);
  const { indexCatalog } = require(`${build}/classCatalog.js`);
  const { lineTree } = require(`${build}/classTree.js`);
  const { buildSchematic } = require(`${build}/schematic.js`);
  const { gildedDescent, gildedSchematic, descentNodes } = require(`${build}/homePath.js`);
  const [catalog, focal] = orchardArgs();
  const f = getForest(catalog, focal);
  const site = f.trees[f.homeLine.tree];
  const index = indexCatalog(catalog);
  const tree = lineTree(index, site.line.slug);
  const person = tree.people.find((p) => p.id === focal && !p.marriedIn);
  const chain = descentNodes(tree.skeleton, person.node);
  assert.equal(chain[0], person.node);
  assert.equal(tree.skeleton.parents[chain[chain.length - 1]], -1, "the chain ends at the root");
  const wood = gildedDescent(tree, focal, site.x, site.z);
  assert.equal(wood.segments.length, chain.length - 1);
  // Joined end to end, from the person down: each segment starts where the next one ends.
  for (let k = 0; k + 1 < wood.segments.length; k++) {
    const a = wood.segments[k], b = wood.segments[k + 1];
    assert.ok(Math.hypot(a.ax - b.bx, a.ay - b.by, a.az - b.bz) < 1e-9);
  }
  const top = wood.segments[0];
  assert.ok(Math.hypot(top.bx - wood.at.x, top.by - wood.at.y, top.bz - wood.at.z) < 1e-9, "the gold reaches the person");
  // Each sleeve is wider than the bark it covers.
  chain.slice(0, -1).forEach((node, k) => assert.ok(wood.segments[k].r > tree.skeleton.radii[node], "a sleeve over the bark"));
  // The schematic's gold ends at the home person's bead on that tree.
  const sch = buildSchematic(index, f.trees);
  const bead = sch.beads.find((b) => b.id === focal && b.tree === f.homeLine.tree);
  const lines = gildedSchematic(sch, tree, focal, site.x, site.z);
  assert.ok(lines.length >= 1);
  assert.ok(lines.some((s) => Math.hypot(s.bx - bead.x, s.by - bead.y, s.bz - bead.z) < 1e-6));
  assert.ok(lines.some((s) => s.ay === 0), "down to the ground");
});
