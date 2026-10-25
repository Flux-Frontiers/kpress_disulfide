import { orchardArgs } from "./orchard.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
globalThis.window ??= { localStorage: { getItem: () => null, setItem() {} } };

const build = process.env.FOREST_TEST_BUILD;
const { indexCatalog } = require(`${build}/classCatalog.js`);
const { lineTree, hubTree, HUB_ROOT } = require(`${build}/classTree.js`);
const { getForest } = require(`${build}/forest.js`);
const { buildSchematic, pickBead, generationColor } = require(`${build}/schematic.js`);

const [catalog, home] = orchardArgs();
const index = indexCatalog(catalog);
const forest = getForest(catalog, home);
const schematic = buildSchematic(index, forest.trees);

test("every class and member on every tree is a bead where the organic layout puts it", () => {
  forest.trees.forEach((t, i) => {
    const people = lineTree(index, t.line.slug).people;
    const beads = schematic.beads.filter((b) => b.tree === i);
    assert.equal(beads.length, people.length, t.line.slug);
    for (const p of people) {
      const b = beads.find((x) => x.id === p.id);
      assert.ok(b, `${t.line.slug}: ${p.id}`);
      assert.ok(Math.hypot(b.x - (t.x + p.x), b.y - p.y, b.z - (t.z + p.z)) < 1e-9);
    }
  });
  assert.ok(schematic.beads.some((b) => b.tree === -1 && b.id === HUB_ROOT), "the database tree's trunk");
  assert.equal(schematic.beads.filter((b) => b.tree === -1).length, hubTree(index).people.length);
});

test("a bead's color is its tier and its plate reads its id, suffix and all", () => {
  for (const b of schematic.beads) {
    assert.equal(b.color, generationColor(b.generation));
    assert.equal(b.name, b.id);
    assert.equal(b.living, false);
  }
  assert.ok(schematic.beads.some((b) => /^\d{5}o$/.test(b.name)), "octant ids keep their o");
  assert.notEqual(generationColor(0), generationColor(1));
});

test("a member is a sphere, a class a cube, the database's trunk a diamond", () => {
  for (const b of schematic.beads) {
    const shape = index.memberOf.has(b.id) ? "round" : b.id === HUB_ROOT ? "diamond" : "square";
    assert.equal(b.shape, shape, b.id);
  }
});

test("every bead hangs by a limb, and there are no marriage bars", () => {
  assert.equal(schematic.bars.length, 0);
  assert.equal(schematic.limbs.length, schematic.beads.length);
});

test("each trunk rises from its tree's ground point", () => {
  forest.trees.forEach((t) => {
    assert.ok(schematic.limbs.some((s) => s.ay === 0 && s.ax === t.x && s.az === t.z), t.line.slug);
  });
});

test("a ray picks the nearest bead it passes through, and misses past them all", () => {
  const b = schematic.beads.find((x) => x.tree === 0);
  const origin = { x: b.x, y: b.y + 0.6, z: b.z };
  assert.equal(pickBead(schematic.beads, origin, { x: 0, y: -1, z: 0 }, 0.45, 200)?.id, b.id);
  assert.equal(pickBead(schematic.beads, { x: 0, y: 500, z: 0 }, { x: 0, y: 1, z: 0 }, 0.45, 200), null);
});
