/**
 * The lantern cart's cargo: one model disulfide for each class the rider has
 * added to the album, its binary class's consensus model in ball and stick,
 * held on a brass pin above a small stand in its grove's color in the bed.
 *
 * Pure layout, no React or three, so the tests can run it. Slot k belongs to
 * the k-th line added, and depends only on k and that line's slug, so adding
 * one more line adds one model and never moves the others.
 *
 * A stand is a block in the grove's color under a brass plate, two boxes, so
 * the cart draws every stand as one InstancedMesh (Cart.tsx). Its model is
 * drawn by the caller at the seat this layout gives it, on a brass pin from
 * the plate to one of its atoms, as the home disulfide stands (Player.tsx).
 * The models ride low and high in a checkerboard, so a model only has to
 * clear its diagonal neighbors at its own height: twice the room of a flat
 * grid.
 *
 * The cart's local frame has forward as +z and the bed floor at y = 0.53. The
 * bed runs 1.04 m between the side rails and from the tailboard to the front
 * board. Stands go in four columns across it and eight rows along it, one per
 * binary class, clear of the lantern's hook at the front left, and no model
 * rises above LOAD_CAP, below the lamp (bottom about 1.13 m) and the rider's
 * eye (CART_EYE, 2.2 m).
 */

/** One box of the load, placed in the cart's local frame. */
export type CartBox = {
  /** Center of the box in the cart's local frame, m. Forward is +z. */
  x: number;
  y: number;
  z: number;
  /** Box size along its own x, y and z, m. */
  w: number;
  h: number;
  d: number;
  /** Yaw about y and a small lean about z, radians. The box turns by yaw after the lean. */
  yaw: number;
  lean: number;
  color: string;
};

/** Where a model stands on its stand, in the cart's local frame. */
export type CartSeat = {
  /** The line whose model this is. */
  slug: string;
  /** The center of the stand's plate, m, where the pin stands. */
  x: number;
  base: number;
  /** Where the model's lowest atom, ball and all, sits, m: the pin's gap above the plate, and the tier's lift. */
  floor: number;
  z: number;
  /** The model's turn about the vertical, radians. */
  yaw: number;
  /** Metres per angstrom. */
  scale: number;
};

/** The top of the bed floor, m: the planks' upper face. */
export const BED_FLOOR = 0.53;
/** No model rises above this, m. */
export const LOAD_CAP = 1.2;

/** Stands across the bed and along it: one for each of the 32 binary classes. */
const COLS = 4;
const ROWS = 8;
const COL_PITCH = 0.25;
const ROW_PITCH = 0.199;
/** Center of the first row, m: a model's reach clear of the tailboard. */
const ROW_Z0 = -0.736;

/** A stand's block, square, and its brass plate, m. */
const STAND = 0.13;
const STAND_H = 0.03;
const PLATE = 0.11;
const PLATE_H = 0.006;
/**
 * A model's scale, m per angstrom. On the full database the consensus models
 * reach 4.57 A from their center and stand 8.94 A tall, balls included: one
 * stands about 27 cm across and high. Two tiers of that rise to 1.12 m,
 * under the lamp (1.13 m), and diagonal neighbors at one height clear each other.
 */
export const MODEL_SCALE = 0.03;
/** A low model's lowest atom clears its plate by this much, m: the pin shows between. */
export const PIN_GAP = 0.02;
/** A high model rides this much higher on its pin, m: a low model's height. */
export const TIER_LIFT = 0.27;

/** Boxes drawn for each stand. */
export const STAND_PARTS = 2;
/** How many models the cart holds; lines added past this are not drawn. */
export const CART_SLOTS = COLS * ROWS;
/** How many boxes the cart draws at most. */
export const CART_CAPACITY = CART_SLOTS * STAND_PARTS;

/** The stand of a model whose line the caller cannot place. */
export const NEUTRAL_COVER = "#6b5a46";
const BRASS = "#b08a3e";
/** Stands are the grove's color tanned toward this brown, by LEATHER_TAN: wood stain, not paint. */
const LEATHER = [0x3a, 0x26, 0x18];
const LEATHER_TAN = 0.5;

/**
 * A grove color as a stand's stain: blended toward a dark brown, so the
 * grove's hue survives but a pastel reads as stained wood.
 *
 * :param hex: "#rrggbb".
 */
export function leather(hex: string): string {
  const v = parseInt(hex.slice(1), 16);
  if (!/^#[0-9a-f]{6}$/i.test(hex) || Number.isNaN(v)) return hex;
  const rgb = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  return "#" + rgb.map((c, i) => Math.round(c + (LEATHER[i]! - c) * LEATHER_TAN).toString(16).padStart(2, "0")).join("");
}

/** A 32-bit FNV-1a hash of a string. */
function hashSlug(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Half the size of the box's bounding box in the cart's frame, m. The box is
 * rotated about z by lean, then about y by yaw.
 *
 * :param b: the box, of which only the size and the two angles are read.
 */
export function cartBoxHalfExtents(b: Pick<CartBox, "w" | "h" | "d" | "yaw" | "lean">): { x: number; y: number; z: number } {
  const cy = Math.abs(Math.cos(b.yaw));
  const sy = Math.abs(Math.sin(b.yaw));
  const cl = Math.abs(Math.cos(b.lean));
  const sl = Math.abs(Math.sin(b.lean));
  // Rows of R = Ry * Rz, absolute values, times the half sizes.
  const hw = b.w / 2;
  const hh = b.h / 2;
  const hd = b.d / 2;
  return {
    x: cy * cl * hw + cy * sl * hh + sy * hd,
    y: sl * hw + cl * hh,
    z: sy * cl * hw + sy * sl * hh + cy * hd,
  };
}

/**
 * Lay out the collected classes in the cart's bed, slot k for the k-th line
 * added, row by row from the front. Past CART_SLOTS the extra lines are
 * not drawn.
 *
 * :param slugs: the lines in the album, in the order they were added.
 * :param colorOf: a line's grove color, by slug; its stand wears it as stain.
 * :returns: STAND_PARTS boxes per stand, stand by stand, and each model's seat.
 */
export function cartLoad(slugs: readonly string[], colorOf: (slug: string) => string): { boxes: CartBox[]; seats: CartSeat[] } {
  const boxes: CartBox[] = [];
  const seats: CartSeat[] = [];
  const n = Math.min(slugs.length, CART_SLOTS);
  for (let k = 0; k < n; k++) {
    const slug = slugs[k]!;
    const col = k % COLS, row = Math.floor(k / COLS);
    const x = (col - (COLS - 1) / 2) * COL_PITCH;
    // From the front, by the lantern, back toward the tailboard.
    const z = ROW_Z0 + (ROWS - 1 - row) * ROW_PITCH;
    const box = (y: number, w: number, h: number, color: string): CartBox => ({ x, y, z, w, h, d: w, yaw: 0, lean: 0, color });
    boxes.push(
      box(BED_FLOOR + STAND_H / 2, STAND, STAND_H, leather(colorOf(slug))),
      box(BED_FLOOR + STAND_H + PLATE_H / 2, PLATE, PLATE_H, BRASS),
    );
    const base = BED_FLOOR + STAND_H + PLATE_H;
    // Each model turned its own way, so the rows do not read as a grid of one shape.
    const yaw = (hashSlug(slug) / 4294967296) * 2 * Math.PI;
    seats.push({ slug, x, base, floor: base + PIN_GAP + ((col + row) % 2) * TIER_LIFT, z, yaw, scale: MODEL_SCALE });
  }
  return { boxes, seats };
}
