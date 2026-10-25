import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { CanvasTexture, SpriteMaterial, SRGBColorSpace, Vector3 } from "three";
import type { Forest } from "./forest";
import { declutter, type PlateRect, type Schematic, type SchematicBead } from "./schematic";
import { sim } from "./sim";
import { useGame } from "./store";

/** Name plates show over the tree nearest the cart, within this far, m: pulled up to it, not passing. */
const LABEL_REACH = 14;
/** A name plate's height as a fraction of the view's: one size on screen at any distance, as GroveLabels does. */
const LABEL_SCREEN = 0.024;
const LABEL_PX = 64;
/** A plate hangs this far above a person's node, m, or below for a married-in spouse. */
const PLATE_LIFT = 0.94;

const at = new Vector3();

/** A name on a dark rounded plate, as a sprite material; cached by name. */
const plates = new Map<string, { material: SpriteMaterial; aspect: number }>();
function plate(name: string) {
  const hit = plates.get(name);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const font = `600 ${LABEL_PX * 0.56}px "Source Sans 3", ui-sans-serif, system-ui, sans-serif`;
  let width = LABEL_PX * 3;
  if (ctx) { ctx.font = font; width = Math.ceil(ctx.measureText(name).width + LABEL_PX * 0.6); }
  canvas.width = width;
  canvas.height = LABEL_PX;
  if (ctx) {
    ctx.font = font;
    ctx.fillStyle = "rgba(22, 33, 62, 0.8)";
    ctx.beginPath();
    ctx.roundRect(0, 0, width, LABEL_PX, LABEL_PX / 2);
    ctx.fill();
    ctx.fillStyle = "#f3ead8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, width / 2, LABEL_PX / 2 + 1);
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  const made = { material: new SpriteMaterial({ map, sizeAttenuation: false, depthTest: false, depthWrite: false, transparent: true, fog: false }), aspect: width / LABEL_PX };
  plates.set(name, made);
  return made;
}

/**
 * Name plates over the classes and sampled bonds of the tree nearest the
 * cart, in the wood view and the schematic alike: the schematic's beads give
 * every node's place on its tree, and the wooden trees are grown from the
 * same layout. Twice a second the plates are laid out on screen trunk first,
 * tier by tier, and a plate that would cover one already placed is left out,
 * so a dense crown shows its coarse classes until the cart draws closer. Not
 * in god's eye, where the grove names (GroveLabels) say enough, nor over the
 * start screen, and off by the "Name plates" setting (N).
 */
export function NamePlates({ forest, schematic }: { forest: Forest; schematic: Schematic }) {
  // The tree whose names show: the nearest to the cart, checked twice a second.
  const [named, setNamed] = useState<number | null>(null);
  const [shown, setShown] = useState<readonly SchematicBead[]>([]);
  const since = useRef(0);
  const godEye = useGame((s) => s.preferences.camera === "god");
  const names = useGame((s) => s.preferences.names);
  // Not over the start screen, where the camera circles the hub.
  const playing = useGame((s) => s.playing);
  // The named tree's plates, trunk first and tier by tier: the order they claim the screen.
  const labels = useMemo(
    () => (named === null || godEye || !names || !playing ? [] : schematic.beads.filter((b) => b.tree === named && b.name))
      .sort((a, b) => a.generation - b.generation),
    [named, schematic, godEye, names, playing],
  );
  useFrame(({ camera }, dt) => {
    since.current += dt;
    if (since.current < 0.5) return;
    since.current = 0;
    // A plate's size on screen in NDC: a sprite without size attenuation is scaled by the projection alone.
    const sy = camera.projectionMatrix.elements[5]!, sx = camera.projectionMatrix.elements[0]!;
    const rects = labels.map((b): PlateRect | null => {
      at.set(b.x, b.y + PLATE_LIFT, b.z).project(camera);
      if (at.z > 1 || Math.abs(at.x) > 1.2 || Math.abs(at.y) > 1.2) return null;
      const p = plate(b.name);
      return { x: at.x, y: at.y, hw: (LABEL_SCREEN * p.aspect * sx) / 2, hh: (LABEL_SCREEN * sy) / 2 };
    });
    const kept = declutter(rects).map((k) => labels[k]!);
    if (kept.length !== shown.length || kept.some((b, i) => b !== shown[i])) setShown(kept);
    let best: number | null = null, bestD = LABEL_REACH;
    const home = Math.hypot(sim.x, sim.z);
    if (home < bestD) { best = -1; bestD = home; }
    forest.trees.forEach((t, i) => {
      const d = Math.hypot(t.x - sim.x, t.z - sim.z);
      if (d < bestD) { best = i; bestD = d; }
    });
    if (best !== named) setNamed(best);
  });

  return (
    <group>
      {/* Until the next layout, only the plates still on the named tree. */}
      {(labels.length ? shown.filter((b) => b.tree === named) : []).map((b) => {
        const p = plate(b.name);
        return (
          // A spouse's plate hangs below their node, their partner's above, so a couple's names do not collide.
          <sprite key={b.id + b.tree} material={p.material} position={[b.x, b.y + (b.marriedIn ? -PLATE_LIFT : PLATE_LIFT), b.z]}
            scale={[LABEL_SCREEN * p.aspect, LABEL_SCREEN, 1]} renderOrder={10} />
        );
      })}
    </group>
  );
}
