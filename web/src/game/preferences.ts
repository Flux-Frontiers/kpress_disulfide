export type Preferences = {
  pace: "gentle" | "brisk";
  sensitivity: number;
  /** "god" looks down on the whole forest from above the hub. */
  camera: "follow" | "high" | "cart" | "god";
  motion: boolean;
  detail: boolean;
  /** Show triangles, draw calls, leaves and frame rate. */
  stats: boolean;
  /** Silent mode: no cards pop up on their own (nearby book, redwood, quest hints). */
  silent: boolean;
  /** Fog density; see FOG_SCALE. */
  fog: FogLevel;
  /** Random weather: morning fogs that burn off, up to pea soup, and drifting cloud (weather.ts). */
  weather: boolean;
  /** Riding the ring, read each grove's summary aloud at its stop. */
  narrate: boolean;
  /** Draw every tree as a family diagram: beads, straight limbs, marriage bars (schematic.ts). */
  schematic: boolean;
  /** Class ids and bond keys over the tree nearest the cart (NamePlates.tsx); off unless turned on. */
  names: boolean;
  /** Sampled bonds shown per octant class; see BOND_CAP. */
  bonds: BondDetail;
  /** Draw only the octant classes with their own limb, so the sparse ones show as gaps (lineTree). */
  prune: boolean;
};

export type BondDetail = "low" | "medium" | "high" | "ultra";

/** Sampled bonds shown on each octant class's dome, lowest energy first; ultra shows every one the export sampled. */
export const BOND_CAP: Record<BondDetail, number> = { low: 1, medium: 3, high: 6, ultra: Infinity };


export type FogLevel = "clear" | "light" | "normal" | "heavy";

/** Multiplier on the season's fog density (World.tsx). */
export const FOG_SCALE: Record<FogLevel, number> = { clear: 0.3, light: 0.6, normal: 1, heavy: 1.8 };

export function readPreferences(value?: Partial<Preferences>): Preferences {
  return {
    pace: value?.pace === "brisk" ? "brisk" : "gentle",
    sensitivity: typeof value?.sensitivity === "number" && Number.isFinite(value.sensitivity)
      ? Math.max(0.5, Math.min(1.5, value.sensitivity)) : 1,
    // New visitors start behind the cart, which shows the road and the trees ahead.
    camera: value?.camera === "high" || value?.camera === "cart" || value?.camera === "god" ? value.camera : "follow",
    motion: typeof value?.motion === "boolean" ? value.motion
      : !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches),
    detail: typeof value?.detail === "boolean" ? value.detail : true,
    stats: value?.stats === true,
    silent: value?.silent === true,
    fog: value?.fog && value.fog in FOG_SCALE ? value.fog : "normal",
    // Defaults chosen by EGS (2026-10-26): random weather on, Medium bonds, sparse octants pruned.
    weather: value?.weather !== false,
    narrate: value?.narrate === true,
    schematic: value?.schematic === true,
    names: typeof value?.names === "boolean" ? value.names : false,
    bonds: value?.bonds && value.bonds in BOND_CAP ? value.bonds : "medium",
    prune: value?.prune !== false,
  };
}
