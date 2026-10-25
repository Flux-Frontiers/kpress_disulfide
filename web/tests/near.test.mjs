import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const build = process.env.FOREST_TEST_BUILD;

test("near points are within reach; a point already near stays until past release", () => {
  const { nearSet } = require(`${build}/near.js`);
  const pts = [{ x: 0, z: 10 }, { x: 0, z: 60 }, { x: 0, z: 80 }, { x: 0, z: 100 }];
  const first = nearSet(pts, 0, 0, 70, 90, new Set());
  assert.deepEqual([...first].sort(), [0, 1]);
  // The cart moves back 15 m: the sign at 60 is now 75 away, inside release, and stays.
  const next = nearSet(pts, 0, -15, 70, 90, first);
  assert.deepEqual([...next].sort(), [0, 1]);
  // A sign never near does not enter at 75 even though it is inside release.
  assert.ok(!nearSet([{ x: 0, z: 75 }], 0, 0, 70, 90, new Set()).has(0));
  // Past release it goes.
  assert.deepEqual([...nearSet(pts, 0, -35, 70, 90, next)].sort(), [0]);
});
