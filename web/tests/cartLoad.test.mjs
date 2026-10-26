import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { cartLoad, cartBoxHalfExtents, leather, STAND_PARTS, BED_FLOOR, CART_SLOTS, CART_CAPACITY, LOAD_CAP, MODEL_SCALE, PIN_GAP, TIER_LIFT } =
  require(`${process.env.FOREST_TEST_BUILD}/cartLoad.js`);

// A database has 32 binary classes; past that the cart drops lines.
const LINES = 40;
const slugs = Array.from({ length: LINES }, (_, k) => `${(k * 7919 % 100000).toString().padStart(5, "0")}b`);
const colorOf = (slug) => `#${(slug.length * 1234567 % 0xffffff).toString(16).padStart(6, "0")}`;
/** The full database's consensus models reach 4.57 A from their center and stand 8.94 A tall, balls included. */
const MODEL_REACH = 4.6 * MODEL_SCALE;
const MODEL_TOP = 9 * MODEL_SCALE;

/** The box's rotated bounding box in the cart's frame. */
function bounds(b) {
  const e = cartBoxHalfExtents(b);
  return { x0: b.x - e.x, x1: b.x + e.x, y0: b.y - e.y, y1: b.y + e.y, z0: b.z - e.z, z1: b.z + e.z };
}

/** A model's room above its stand. */
function room(s) {
  return { x0: s.x - MODEL_REACH, x1: s.x + MODEL_REACH, y0: s.floor, y1: s.floor + MODEL_TOP, z0: s.z - MODEL_REACH, z1: s.z + MODEL_REACH };
}

/** Do the two regions overlap? */
function cuts(a, r) {
  return a.x1 > r.x0 && a.x0 < r.x1 && a.y1 > r.y0 && a.y0 < r.y1 && a.z1 > r.z0 && a.z0 < r.z1;
}

test("an empty album carries nothing, and n lines give n stands and n models", () => {
  assert.deepEqual(cartLoad([], colorOf), { boxes: [], seats: [] });
  for (const n of [1, 2, 4, 5, 17, 32]) {
    const load = cartLoad(slugs.slice(0, n), colorOf);
    assert.equal(load.boxes.length, n * STAND_PARTS);
    assert.deepEqual(load.seats.map((s) => s.slug), slugs.slice(0, n));
  }
});

test("the cart holds every binary class and drops lines past that", () => {
  assert.equal(CART_SLOTS, 32);
  assert.equal(CART_CAPACITY, CART_SLOTS * STAND_PARTS);
  const load = cartLoad(slugs, colorOf);
  assert.equal(load.boxes.length, CART_CAPACITY);
  assert.equal(load.seats.length, CART_SLOTS);
});

test("a stand wears its line's grove color as stain under a brass plate", () => {
  const { boxes } = cartLoad(slugs.slice(0, 10), colorOf);
  for (let k = 0; k < 10; k++) {
    assert.deepEqual(boxes.slice(k * STAND_PARTS, (k + 1) * STAND_PARTS).map((b) => b.color), [leather(colorOf(slugs[k])), "#b08a3e"]);
  }
});

test("the models ride on pins, low and high in a checkerboard; the stands all sit on the bed", () => {
  const { boxes, seats } = cartLoad(slugs, colorOf);
  seats.forEach((s, k) => {
    assert.ok(Math.abs(s.base - bounds(boxes[k * STAND_PARTS + 1]).y1) < 1e-9, "the pin stands on its plate");
    const high = (k % 4 + Math.floor(k / 4)) % 2 === 1;
    assert.ok(Math.abs(s.floor - (s.base + PIN_GAP + (high ? TIER_LIFT : 0))) < 1e-9, `model ${k} ${high ? "high" : "low"}`);
  });
  assert.equal(new Set(boxes.map((b) => bounds(b).y0.toFixed(6))).size, 2, "a block on the bed and a plate on the block, the same in every stand");
});

test("adding one more line adds one model and moves none", () => {
  const full = cartLoad(slugs, colorOf);
  for (let k = 0; k < CART_SLOTS; k++) {
    const some = cartLoad(slugs.slice(0, k + 1), colorOf);
    assert.deepEqual(some.boxes, full.boxes.slice(0, (k + 1) * STAND_PARTS), `after ${k + 1} lines`);
    assert.deepEqual(some.seats, full.seats.slice(0, k + 1), `after ${k + 1} lines`);
  }
});

test("the same album gives the same load", () => {
  assert.deepEqual(cartLoad(slugs, colorOf), cartLoad([...slugs], colorOf));
});

test("every stand and model sits inside the bed, the stands on the floor, the models under the cap", () => {
  const { boxes, seats } = cartLoad(slugs, colorOf);
  // The side rails stand at 0.55 m; the tailboard and front board at -0.9 and 0.9, 0.05 m thick.
  for (const r of [...boxes.map(bounds), ...seats.map(room)]) {
    assert.ok(r.x0 >= -0.55 && r.x1 <= 0.55, `x ${r.x0.toFixed(3)}..${r.x1.toFixed(3)}`);
    assert.ok(r.z0 >= -0.875 && r.z1 <= 0.875, `z ${r.z0.toFixed(3)}..${r.z1.toFixed(3)}`);
    assert.ok(r.y0 >= BED_FLOOR - 1e-9 && r.y1 <= LOAD_CAP, `y ${r.y0.toFixed(3)}..${r.y1.toFixed(3)}`);
  }
  assert.ok(Math.abs(bounds(boxes[0]).y0 - BED_FLOOR) < 1e-9, "the first stand stands on the floor");
});

test("the view from the seat and from behind is clear: nothing stands in 1.3 to 1.65 m", () => {
  const slab = { x0: -1, x1: 1, y0: 1.3, y1: 1.65, z0: -0.45, z1: 0.9 };
  const { boxes, seats } = cartLoad(slugs, colorOf);
  for (const r of [...boxes.map(bounds), ...seats.map(room)]) assert.ok(!cuts(r, slab));
});

test("the lantern's hook and lamp are clear of the load", () => {
  // The hook stands at x -0.46, z 0.84; the lamp hangs at x -0.2, z 0.84, from
  // 1.13 m up, with a 0.1 m radius.
  const hook = { x0: -0.5, x1: -0.42, y0: 0.48, y1: 1.5, z0: 0.8, z1: 0.88 };
  const lamp = { x0: -0.32, x1: -0.08, y0: 1.13, y1: 1.4, z0: 0.72, z1: 0.96 };
  const { boxes, seats } = cartLoad(slugs, colorOf);
  for (const r of [...boxes.map(bounds), ...seats.map(room)]) {
    assert.ok(!cuts(r, hook));
    assert.ok(!cuts(r, lamp));
  }
});

test("no model shares space with another model or another stand", () => {
  const { boxes, seats } = cartLoad(slugs, colorOf);
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      // A model's room is a box round its reach; diagonal neighbors at one height clear each other as spheres do.
      const a = seats[i], b = seats[j];
      const apart = Math.hypot(a.x - b.x, a.z - b.z) >= 2 * MODEL_REACH;
      assert.ok(apart || !cuts(room(a), room(b)), `models ${i} and ${j}`);
    }
    boxes.forEach((box, n) => {
      if (Math.floor(n / STAND_PARTS) === i) return;
      // The reach is a radius, so a post beside it clears if the distance between them does.
      const d = Math.hypot(box.x - seats[i].x, box.z - seats[i].z) - box.w / 2;
      assert.ok(d >= MODEL_REACH || !cuts(bounds(box), room(seats[i])), `model ${i} and box ${n}`);
    });
  }
});

test("leather keeps a grove's hue and darkens it", () => {
  assert.equal(leather("#ffffff"), "#9d938c");
  assert.equal(leather("#3a2618"), "#3a2618");
  const red = leather("#e05050");
  assert.ok(parseInt(red.slice(1, 3), 16) > parseInt(red.slice(3, 5), 16), `still red: ${red}`);
  assert.equal(leather("not a color"), "not a color");
});
