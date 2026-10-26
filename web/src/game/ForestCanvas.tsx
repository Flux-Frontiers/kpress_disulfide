import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { ACESFilmicToneMapping, PerspectiveCamera, Raycaster, Vector2, type Ray } from "three";
import { indexCatalog, type ClassCatalog } from "./classCatalog";
import { openRecord } from "./ClassReader";
import { COARSE_POINTER, EXPOSURE, PHONE } from "./Environment";
import { pickTree, type Forest, type TreeSite } from "./forest";
import { forestGodLimits, godPose, zoomGodView } from "./godEye";
import { GroveLabels } from "./GroveLabels";
import { Player } from "./Player";
import { HomeMarks } from "./HomeMarks";
import { NamePlates } from "./NamePlates";
import { SchematicOrchard } from "./SchematicOrchard";
import { buildSchematic, pickBead, type SchematicBead } from "./schematic";
import { flyToTree, jumpToTree } from "./HUD";
import { setScreenshotCapture } from "./screenshot";
import { Trees } from "./Trees";
import { World } from "./World";
import { useGame } from "./store";

/** How near a click must pass to a database-tree limb's node to pick it, m: its foliage reaches about this far. */
const HUB_LIMB_PICK = 1.5;

export function ForestCanvas({ forest, catalog }: { forest: Forest; catalog: ClassCatalog | null }) {
  const season = useGame((s) => s.season);
  const query = useGame((s) => s.query);
  const playing = useGame((s) => s.playing);
  const detail = useGame((s) => s.preferences.detail);
  const picker = useRef<((e: MouseEvent) => TreeSite | null) | null>(null);
  const schematic = useGame((s) => s.preferences.schematic) && catalog !== null;
  const beadPicker = useRef<((ray: Ray, maxDist: number) => SchematicBead | null) | null>(null);
  // Every class's and member's place on its tree: the schematic draws it, and the name plates hang from it in either view.
  const index = useMemo(() => (catalog ? indexCatalog(catalog) : null), [catalog]);
  const layout = useMemo(
    () => (index ? buildSchematic(index, forest.trees, forest.bonds, forest.corpusTree.focal, forest.prune) : null),
    [index, forest],
  );
  // The database tree's 32 limbs, where its foliage hangs in either view.
  const hubLimbs = useMemo(() => layout?.beads.filter((b) => b.tree === -1 && b.generation === 1) ?? [], [layout]);

  return (
    <Canvas
      // "percentage" is PCFShadowMap, which three r186 makes soft itself; "soft" asks for the removed PCFSoftShadowMap.
      shadows={detail ? "percentage" : false}
      camera={{ position: [forest.spawn.x, 6.2, forest.spawn.z + 10], fov: 58, near: 0.12, far: 560 }}
      dpr={[1, PHONE ? 1 : COARSE_POINTER ? 1.25 : 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor("#16213e");
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = EXPOSURE;
      }}
      onPointerDown={() => (document.activeElement as HTMLElement | null)?.blur()}
      onPointerMissed={(e) => {
        const s = useGame.getState();
        if (s.catalogOpen) s.setCatalogOpen(false);
        else if (s.libraryOpen) s.toggleLibrary();
        else if (s.atlasOpen) s.toggleAtlas();
        else {
          // A limb of the database tree, in either view: off to that class's own tree.
          aim(e);
          const limb = pickBead(hubLimbs, raycaster.ray.origin, raycaster.ray.direction, HUB_LIMB_PICK, 200);
          const own = limb ? forest.trees.find((t) => t.line.slug === limb.id) : undefined;
          if (own) { (s.preferences.camera === "god" ? flyToTree : jumpToTree)(own); return; }
          // In schematic mode a bead opens its class's or bond's page.
          if (schematic && beadPicker.current) {
            aim(e);
            const bead = beadPicker.current(raycaster.ray, 200);
            const line = bead ? index?.lineOf.get(bead.id) : undefined;
            if (line && forest.trees.some((t) => t.line.slug === line)) { openRecord(line, bead!.id); return; }
          }
          // Clicking a tree pins its card, silent mode or not; clicking open ground clears it.
          const tree = picker.current?.(e);
          if (tree) s.pinTree(tree.line.slug);
          else s.dismissNearby();
        }
      }}
    >
      <World forest={forest} season={season} />
      {schematic && layout ? <SchematicOrchard schematic={layout} picker={beadPicker} /> : <Trees forest={forest} season={season} query={query} />}
      {layout ? <NamePlates forest={forest} schematic={layout} /> : null}
      {catalog ? <HomeMarks forest={forest} catalog={catalog} schematic={schematic ? layout : null} /> : null}
      <StatsSampler />
      <ScreenshotCapture />
      <TreePicker forest={forest} picker={picker} />
      <GodEyeZoom forest={forest} />
      <GroveLabels forest={forest} />
      <Player forest={forest} playing={playing} />
    </Canvas>
  );
}

/** Twice a second, copy the renderer's last-frame counts into the store for the HUD readout. */
function StatsSampler() {
  const acc = useRef({ t: 0, frames: 0 });
  useFrame(({ gl }, delta) => {
    const s = useGame.getState();
    if (!s.preferences.stats) {
      if (s.stats) s.setStats(null);
      return;
    }
    acc.current.t += delta;
    acc.current.frames++;
    if (acc.current.t < 0.5) return;
    // Counts cover the whole previous frame, shadow pass included.
    s.setStats({ tris: gl.info.render.triangles, calls: gl.info.render.calls, fps: acc.current.frames / acc.current.t });
    acc.current = { t: 0, frames: 0 };
  });
  return null;
}

const raycaster = new Raycaster();
const ndc = new Vector2();
/** The camera the click came through, for aim(); set by TreePicker. */
let clickCamera: PerspectiveCamera | null = null;
let clickCanvas: HTMLCanvasElement | null = null;

/** Point the shared raycaster through the clicked pixel. */
function aim(e: MouseEvent): void {
  if (!clickCamera || !clickCanvas) return;
  const rect = clickCanvas.getBoundingClientRect();
  ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, clickCamera);
}

/** Trees have no pointer handlers (raycasting their meshes is costly), so a click that hits nothing is tested against their outlines. */
function TreePicker({ forest, picker }: { forest: Forest; picker: RefObject<((e: MouseEvent) => TreeSite | null) | null> }) {
  const { camera, gl, scene } = useThree();
  useEffect(() => {
    clickCamera = camera as PerspectiveCamera;
    clickCanvas = gl.domElement;
    picker.current = (e) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      // No farther than the fog lets you see (Trees.tsx hides groves past the same cutoff).
      const density = scene.fog && "density" in scene.fog ? (scene.fog.density as number) : 0;
      const maxDist = density > 0 ? 2.6 / density : 200;
      return pickTree(forest, raycaster.ray.origin, raycaster.ray.direction, maxDist);
    };
    return () => { picker.current = null; };
  }, [forest, picker, camera, gl, scene]);
  return null;
}

const godCam = new PerspectiveCamera();
const zoomRay = new Raycaster();

/**
 * In god's eye, the wheel and a two-finger pinch zoom toward the ground point
 * under the cursor or between the fingers (godEye.ts). The point is found
 * from the pose the camera is easing to, not the one it shows, so a quick run
 * of wheel clicks stays anchored.
 */
function GodEyeZoom({ forest }: { forest: Forest }) {
  const { camera, gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const godEye = () => {
      const s = useGame.getState();
      return s.preferences.camera === "god" && !s.flight && s.playing;
    };
    const zoomAt = (clientX: number, clientY: number, factor: number) => {
      const rect = el.getBoundingClientRect();
      const pose = godPose();
      godCam.copy(camera as PerspectiveCamera);
      godCam.position.set(pose.cam.x, pose.cam.y, pose.cam.z);
      godCam.lookAt(pose.look.x, pose.look.y, pose.look.z);
      godCam.updateMatrixWorld();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      zoomRay.setFromCamera(ndc, godCam);
      const { origin, direction } = zoomRay.ray;
      // Above the horizon there is no ground under the cursor: zoom about the view's centre.
      const t = direction.y < -1e-3 ? -origin.y / direction.y : 0;
      const ax = t > 0 ? origin.x + direction.x * t : pose.look.x;
      const az = t > 0 ? origin.z + direction.z * t : pose.look.z;
      zoomGodView(ax, az, factor, forestGodLimits(forest), forest.worldRadius);
    };
    const onWheel = (e: WheelEvent) => {
      if (!godEye()) return;
      e.preventDefault();
      // Lines and pages scroll farther than pixels; a mouse notch is about 100 px.
      const px = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 600 : 1);
      zoomAt(e.clientX, e.clientY, Math.exp(px * 0.0015));
    };
    const touches = new Map<number, { x: number; y: number }>();
    let spread = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      spread = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size !== 2 || !godEye()) return;
      const [a, b] = [...touches.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (spread > 0 && d > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, spread / d);
      spread = d;
    };
    const onUp = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      spread = 0;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [forest, camera, gl]);
  return null;
}

/** Lets the HUD's camera button read the view: render a frame and read it back in the same task, before the buffer clears. */
function ScreenshotCapture() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    setScreenshotCapture(() => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    });
    return () => setScreenshotCapture(null);
  }, [gl, scene, camera]);
  return null;
}
