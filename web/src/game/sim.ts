import { getForest, treesNear, type Forest } from "./forest";
import { clamp } from "./math";
import type { Preferences } from "./preferences";

export type SimState = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  lat: number;
  steering: number;
  ready: boolean;
};

export const sim: SimState = {
  x: 0,
  y: 0,
  z: 8,
  yaw: 0,
  speed: 0,
  lat: 0,
  steering: 0,
  ready: false,
};

export function resetSim(forest: Forest) {
  sim.x = forest.spawn.x;
  sim.z = forest.spawn.z;
  sim.yaw = forest.spawn.yaw;
  sim.speed = 0;
  sim.lat = 0;
  sim.steering = 0;
  sim.y = 0;
  sim.ready = true;
}

export function teleportSim(x: number, z: number, yaw: number) {
  sim.x = x;
  sim.z = z;
  sim.yaw = yaw;
  sim.speed = 0;
  sim.lat = 0;
  sim.steering = 0;
  sim.y = 0;
}

export function wrapAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

export function yawToward(fromX: number, fromZ: number, toX: number, toZ: number): number {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  return Math.atan2(-dx, -dz);
}

/** The most the cart's top speed grows out on the rings: a lap of any ring takes about as long as the inner ring's. */
export const CRUISE_MAX = 2.2;

/**
 * How much faster the cart may go here: its distance from the hub over the
 * inner ring's radius, from 1 inside the inner ring up to CRUISE_MAX.
 *
 * :param forest: Its ring roads.
 * :param x: The cart's position, m.
 */
export function cruiseFactor(forest: Pick<Forest, "roadLines">, x: number, z: number): number {
  const rings = forest.roadLines.filter((l) => l.kind === "ring").map((l) => Math.hypot(...l.pts[0]!));
  if (!rings.length) return 1;
  return clamp(Math.hypot(x, z) / Math.min(...rings), 1, CRUISE_MAX);
}

export function stepVehicle(
  forest: Forest,
  throttle: number,
  steer: number,
  boost: boolean,
  dt: number,
  options: { brake?: boolean; pace?: Preferences["pace"]; sensitivity?: number; cruise?: number } = {},
) {
  // Small steps keep collisions and handling stable across frame rates.
  const steps = Math.ceil(Math.min(Math.max(dt, 0), 0.1) / (1 / 120));
  if (!steps) return;
  for (let i = 0; i < steps; i++) step(forest, throttle, steer, boost, Math.min(dt, 0.1) / steps, options);
}

function step(forest: Forest, throttle: number, steer: number, boost: boolean, dt: number,
  options: { brake?: boolean; pace?: Preferences["pace"]; sensitivity?: number; cruise?: number }) {
  const gentle = options.pace !== "brisk";
  // Halved for the compact layout (trees ~9 m apart): gentle is ~16 km/h.
  // Out on the rings the cart may cruise faster (cruiseFactor).
  const cruise = Math.max(1, options.cruise ?? 1);
  const maxSpeed = (gentle ? 4.5 : 9) * (boost ? 1.45 : 1) * cruise;
  const accel = (gentle ? 6 : 12) * cruise;
  if (options.brake) {
    sim.speed = Math.sign(sim.speed) * Math.max(0, Math.abs(sim.speed) - 32 * dt);
  } else {
    sim.speed += clamp(throttle, -1, 1) * accel * dt;
  }
  const drag = throttle === 0 ? 4.5 : 0.65;
  sim.speed *= Math.exp(-drag * dt);
  if (Math.abs(sim.speed) < 0.04 && throttle === 0) sim.speed = 0;
  // Over the cap (the cruise just ended, by a card or a stop), ease down to it rather than stop dead.
  if (sim.speed > maxSpeed) sim.speed = Math.max(maxSpeed, sim.speed - 10 * dt);
  sim.speed = Math.max(sim.speed, gentle ? -2.5 : -4.5);

  const speedFactor = clamp(Math.abs(sim.speed) / 5, 0.65, 1);
  const turnRate = 1.55;
  sim.steering += (clamp(steer, -1, 1) - sim.steering) * (1 - Math.exp(-12 * dt));
  // Steering turns the cart the way it is pushed, seen from behind, whether it
  // is going forward or backward. A car's steering flips in reverse; on a stick
  // that reads as the control switching sides, most of all near a standstill.
  sim.yaw = wrapAngle(sim.yaw + sim.steering * turnRate * (options.sensitivity ?? 1) * speedFactor * dt);

  const fx = -Math.sin(sim.yaw);
  const fz = -Math.cos(sim.yaw);
  const rx = Math.cos(sim.yaw);
  const rz = -Math.sin(sim.yaw);

  sim.lat *= Math.exp(-12 * dt);

  sim.x += (fx * sim.speed + rx * sim.lat) * dt;
  sim.z += (fz * sim.speed + rz * sim.lat) * dt;

  const cartR = 1.05;
  const near = treesNear(forest, sim.x, sim.z, 8);
  for (const t of near) {
    const dx = sim.x - t.x;
    const dz = sim.z - t.z;
    const min = t.trunkRadius + cartR;
    const d = Math.hypot(dx, dz);
    if (d < min) {
      const nx = d > 1e-4 ? dx / d : -fx;
      const nz = d > 1e-4 ? dz / d : -fz;
      sim.x += nx * (min - d);
      sim.z += nz * (min - d);
      sim.speed *= 0.55;
    }
  }

  // The redwood's root flare and the exhibits' plinths.
  for (const o of forest.obstacles) {
    const dx = sim.x - o.x, dz = sim.z - o.z;
    const d = Math.hypot(dx, dz);
    const min = o.r + cartR;
    if (d < min) {
      const nx = d > 1e-4 ? dx / d : -fx, nz = d > 1e-4 ? dz / d : -fz;
      sim.x = o.x + nx * min;
      sim.z = o.z + nz * min;
      sim.speed *= 0.55;
    }
  }

  const lim = forest.worldRadius;
  const rd = Math.hypot(sim.x, sim.z);
  if (rd > lim) {
    sim.x *= lim / rd;
    sim.z *= lim / rd;
    sim.speed *= 0.4;
  }
}

export function forwardOf(yaw: number): { x: number; z: number } {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

export { getForest };
