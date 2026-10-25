import { ATOMS, HOME_BOND, SUBSET, orchardArgs } from "./orchard.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
globalThis.window ??= { localStorage: { getItem: () => null, setItem() {} } };
const build = process.env.FOREST_TEST_BUILD;

test("ball-and-stick follows _render_ss: CPK radius times bs_scale, half bonds in their atoms' colors", () => {
  const { ballAndStick } = require(`${build}/molecule.js`);
  const at = { x: 10, y: 2, z: -4, yaw: 0, scale: 0.5 };
  const { balls, sticks } = ballAndStick(HOME_BOND, ATOMS, at);
  assert.equal(balls.length, HOME_BOND.atoms.length);
  assert.equal(sticks.length, 2 * HOME_BOND.bonds.length);
  HOME_BOND.atoms.forEach((a, i) => {
    assert.equal(balls[i].color, ATOMS.colors[a.element]);
    assert.ok(Math.abs(balls[i].r - ATOMS.radii[a.element] * ATOMS.bs_scale * at.scale) < 1e-9);
    assert.ok(Math.abs(balls[i].x - (at.x + a.x * at.scale)) < 1e-9);
  });
  // The disulfide bond itself, SG to SG, is yellow at both ends.
  const sg = HOME_BOND.bonds.findIndex(([i, j]) => HOME_BOND.atoms[i].name === "SG" && HOME_BOND.atoms[j].name === "SG");
  assert.ok(sg >= 0);
  assert.equal(sticks[2 * sg].color, ATOMS.colors.SG);
  assert.equal(sticks[2 * sg + 1].color, ATOMS.colors.SG);
  // Two halves meet at the bond's midpoint.
  const [a, b] = [sticks[2 * sg], sticks[2 * sg + 1]];
  assert.ok(Math.hypot(a.bx - b.bx, a.by - b.by, a.bz - b.bz) < 1e-9);
  assert.ok(Math.abs(a.r - ATOMS.bond_radius * at.scale) < 1e-9);
});

test("a turn about the vertical keeps every distance", () => {
  const { ballAndStick } = require(`${build}/molecule.js`);
  const a = ballAndStick(HOME_BOND, ATOMS, { x: 0, y: 0, z: 0, yaw: 0, scale: 1 }).balls;
  const b = ballAndStick(HOME_BOND, ATOMS, { x: 0, y: 0, z: 0, yaw: 1.1, scale: 1 }).balls;
  const d = (p, q) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
  for (let i = 1; i < a.length; i++) assert.ok(Math.abs(d(a[0], a[i]) - d(b[0], b[i])) < 1e-9);
});

test("models are drawn as proteusPy draws a modelled disulfide: 10 atoms and the backbone table", () => {
  for (const l of SUBSET.lines) {
    assert.equal(l.model.atoms.length, 10, l.id);
    assert.equal(l.model.bonds.length, ATOMS.bonds_model.length, l.id);
  }
  assert.equal(HOME_BOND.atoms.length, 12, "subset bonds have no neighbouring residues");
  assert.equal(HOME_BOND.bonds.length, 11);
});

test("each grove has its representative on its stop plaza and each tree its foot plate, clear of the road", () => {
  const { getForest } = require(`${build}/forest.js`);
  const f = getForest(...orchardArgs());
  const reps = f.molecules.filter((m) => m.kind === "representative");
  const plates = f.molecules.filter((m) => m.kind === "plate");
  assert.equal(reps.length, f.groves.length);
  assert.equal(plates.length, f.trees.length);
  for (const r of reps) {
    const stop = f.circuit.find((wp) => wp.genre === r.of);
    const d = Math.hypot(r.x - stop.x, r.z - stop.z);
    // Off the ring by the cart's clearance (2.75 m) and its own, and touching the stop plaza (3.2 m).
    assert.ok(d >= 2.75 + 0.9 - 1e-6 && d - 1.2 < 3.2, `${r.of}: ${d.toFixed(2)} m from its stop`);
    assert.ok(f.plazas.some((p) => Math.hypot(p.x - r.x, p.z - r.z) < 1e-6), `${r.of}: no pad`);
    const grove = f.groves.find((g) => g.genre === r.of);
    assert.equal(r.model, SUBSET.lines.find((l) => l.id === SUBSET.groves.find((g) => g.id === grove.genre).lines[0]).model);
    assert.ok(f.obstacles.some((o) => o.x === r.x && o.z === r.z), `${r.of}: the cart can drive into it`);
  }
  for (const p of plates) {
    const t = f.trees.find((tr) => tr.line.slug === p.of);
    assert.ok(Math.hypot(p.x - t.x, p.z - t.z) > t.trunkRadius, `${p.of}: inside the bark`);
  }
  assert.ok(Math.hypot(f.monument.x, f.monument.z) < 10, "the monument stands on the hub plaza");
});
