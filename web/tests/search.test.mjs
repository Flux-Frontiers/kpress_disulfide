import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// A line's lantern text is its class ids, names, function and sampled bond keys, lower-cased.
const line = (slug, title) => ({ slug, title, search: title.toLowerCase() });
const tree = (slug, title, x, z) => ({ line: line(slug, title), x, z, trunkRadius: 0.6 });

test("search results come nearest first and skip non-matches", () => {
  const { searchTrees } = require(`${process.env.FOREST_TEST_BUILD}/forest.js`);
  const forest = { trees: [tree("far", "Fire Far", 100, 0), tree("none", "Ice", 1, 0), tree("near", "Fire Near", 10, 0)] };
  assert.deepEqual(searchTrees(forest, "fire", 0, 0).map((t) => t.line.slug), ["near", "far"]);
  assert.deepEqual(searchTrees(forest, "  ", 0, 0), []);
});

test("jumping to a tree lands within reading range, on the near side, facing the trunk", () => {
  const { treeApproach } = require(`${process.env.FOREST_TEST_BUILD}/forest.js`);
  const { forwardOf } = require(`${process.env.FOREST_TEST_BUILD}/sim.js`);
  const t = tree("t", "T", 50, 20);
  const pose = treeApproach(t, 0, 20);
  const d = Math.hypot(pose.x - t.x, pose.z - t.z);
  assert.ok(d > t.trunkRadius + 1 && d < 6.8, `distance ${d}`);
  assert.ok(pose.x < t.x);
  const f = forwardOf(pose.yaw);
  assert.ok(f.x * (t.x - pose.x) + f.z * (t.z - pose.z) > 0.99 * d, "faces the tree");
});

test("the lantern finds a tree by PDB id, class id with its suffix, class name and function word", async () => {
  const { orchardArgs, HOME_BOND } = await import("./orchard.mjs");
  const { getForest, searchTrees } = require(`${process.env.FOREST_TEST_BUILD}/forest.js`);
  const f = getForest(...orchardArgs());
  const hits = (q) => searchTrees(f, q, 0, 0).map((t) => t.line.slug);
  assert.ok(hits(HOME_BOND.pdb_id).includes(HOME_BOND.classes.binary), "a PDB id finds the trees its bonds are sampled on");
  assert.ok(hits(HOME_BOND.classes.octant).includes(HOME_BOND.classes.binary), "an octant class id");
  assert.deepEqual(hits("00000b"), ["00000b"]);
  assert.ok(hits("lhspiral").includes("00000b"), "a family name");
  const catalytic = f.trees.filter((t) => t.line.function === "Catalytic").map((t) => t.line.slug).sort();
  assert.ok(catalytic.length > 0);
  assert.deepEqual(hits("catalytic").sort(), catalytic, "a function word");
});
