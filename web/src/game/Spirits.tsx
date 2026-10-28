// Spirits from Art Techno (../art_techno, "The Gilded Circuit"), each in an
// exhibit glade of her own: the Spirit of Life, biology meets computation,
// holding the double helix as a staff, and the Spirit of Innovation, Eureka,
// springing forward as the idea ignites. Their models are Art Techno's, CC
// BY-NC 4.0 (see PROVENANCE.md), copied into public/models by `make art` and
// never committed; without one its glade shows only its plaque. `make art`
// also writes a simplified copy of each (public/models/far), drawn until the
// rider comes near: the full models run to a million triangles apiece, and
// with their three 2048 px maps hold about 80 MB each on the GPU, so a full
// model is fetched only as the cart comes within SPIRIT_LOAD of its glade
// and freed once it is past SPIRIT_FREE.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box3, LOD, Mesh, MeshStandardMaterial, type Object3D, Texture, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { ASSET_ROOT } from "./ClassReader";
import { COARSE_POINTER } from "./Environment";
import type { Exhibit } from "./exhibits";
import { useNear } from "./near";
import { ExhibitPlaque } from "./Signposts";
import { UplightFixtures, useUplitMaterials } from "./Uplights";

/**
 * A Spirit's height, m: about the database tree's, mid-range among the class
 * trees. Art Techno exports and shows its Spirits at one size, so they share it.
 */
export const SPIRIT_HEIGHT = 10;
/** The floodlights at her foot: warm, reaching about half her height. */
const SPIRIT_GLOW = { strength: 0.35, falloff: 5 };
/**
 * Her bronze's metalness, scaling the model's own map: the scene has no
 * environment map, and at the model's full metalness she has nothing to
 * reflect and renders nearly black (as WindSculptures.tsx notes).
 */
const SPIRIT_METALNESS = 0.45;
/** Within this far, m, the full model replaces the simplified one. */
const SPIRIT_NEAR = 30;
/** The cart within this far of a glade, m, fetches its full model; past SPIRIT_FREE frees it. */
const SPIRIT_LOAD = 60;
const SPIRIT_FREE = 90;

const ART_TECHNO =
  "She is one of the nine Spirits of Art Techno, which does for the computer age what Art Deco did " +
  "for the machine age";

/** A Spirit: her model in public/models, and her plaque, adapted from Art Techno's spirits.ts. */
type SpiritSpec = { model: string; title: string; byline: string; body: string };

const LIFE: SpiritSpec = {
  model: "life.glb",
  title: "Spirit of Life",
  byline: "Art Techno · Biology meets computation",
  body:
    "Life written in code. She holds the double helix as a staff whose strands feed a chip at its " +
    "crown, and the chip radiates like the rising sun. In her open palm rests a glowing cell. " +
    `${ART_TECHNO}: here, among the disulfides, biology meets computation.`,
};

const INNOVATION: SpiritSpec = {
  model: "innovation-eureka.glb",
  title: "Spirit of Innovation",
  byline: "Art Techno · Invention",
  body:
    "Eureka. She is pulling the idea from her mind and her heart, and the joy of it carries her forward, " +
    "the only Spirit in motion. Joining the two halves of a chip at her heart is the symbolic act: a " +
    `sunburst breaks out across her chest, and gold traces carry it down her arms and legs. ${ART_TECHNO}.`,
};

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

/** A model and its fit to SPIRIT_HEIGHT, from her own bounds. */
type Fit = { scene: Object3D; scale: number; offset: readonly [number, number, number]; materials: MeshStandardMaterial[] };

/**
 * Fitted as loaded, before she stands anywhere: Box3.setFromObject measures in
 * world space, so measured once placed (a remount, a hot reload) the glade's
 * own position would be fitted away and she would stand off in the wild.
 */
function fitSpirit(scene: Object3D): Fit {
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(scene);
  const size = box.getSize(new Vector3()), centre = box.getCenter(new Vector3());
  const scale = SPIRIT_HEIGHT / size.y;
  const materials: MeshStandardMaterial[] = [];
  scene.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    o.castShadow = o.receiveShadow = true;
    for (const m of [o.material].flat()) {
      if (!(m instanceof MeshStandardMaterial)) continue;
      m.metalness = SPIRIT_METALNESS;
      materials.push(m);
    }
  });
  return { scene, scale, offset: [-centre.x * scale, -box.min.y * scale, -centre.z * scale], materials };
}

/** Each model, fetched and fitted once while it is wanted. */
const models = new Map<string, Promise<Fit>>();

/** Free a model's geometry, textures and materials on the GPU. */
function disposeSpirit(scene: Object3D): void {
  scene.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    o.geometry.dispose();
    for (const m of [o.material].flat()) {
      for (const v of Object.values(m)) if (v instanceof Texture) v.dispose();
      m.dispose();
    }
  });
}

/**
 * :param file: Its path under public/models, or null for none.
 * :param free: Dispose of it when it is no longer wanted, so it is fetched
 *   again next time; the simplified copies are kept.
 */
function useSpiritModel(file: string | null, free = false): Fit | null {
  const [held, setHeld] = useState<{ file: string; fit: Fit } | null>(null);
  useEffect(() => {
    if (!file) return;
    let live = true;
    let model = models.get(file);
    if (!model) {
      model = loader.loadAsync(`${ASSET_ROOT}models/${file}`).then((g) => fitSpirit(g.scene));
      models.set(file, model);
    }
    // Not there without `make art`: the glade keeps its plaque and no statue.
    model.then((fit) => { if (live) setHeld({ file, fit }); }, () => {});
    return () => {
      live = false;
      if (!free) return;
      // Out of the scene by now: the render that dropped `file` drew without it.
      models.delete(file);
      model.then((fit) => disposeSpirit(fit.scene), () => {});
    };
  }, [file, free]);
  return file && held?.file === file ? held.fit : null;
}

/**
 * A statue, fitted from her own bounds to SPIRIT_HEIGHT, standing on the
 * ground, facing the road: the simplified model from afar, the full one
 * (Art Techno's lighter export on a touch screen) within SPIRIT_NEAR, held
 * only while the cart is within SPIRIT_LOAD to SPIRIT_FREE.
 */
function Spirit({ exhibit, spec }: { exhibit: Exhibit; spec: SpiritSpec }) {
  const glade = useMemo(() => [{ x: exhibit.x, z: exhibit.z }], [exhibit.x, exhibit.z]);
  const close = useNear(glade, SPIRIT_LOAD, SPIRIT_FREE).has(0);
  const near = useSpiritModel(close ? `${COARSE_POINTER ? "mobile/" : ""}${spec.model}` : null, true);
  const far = useSpiritModel(`far/${spec.model}`);
  const fits = useMemo(() => [near, far].filter((f): f is Fit => f !== null), [near, far]);
  const materials = useMemo(() => fits.flatMap((f) => f.materials), [fits]);
  useUplitMaterials(materials, "#ffe2b0", SPIRIT_GLOW.strength, SPIRIT_GLOW.falloff);
  // React places the models; the LOD is only told which child shows from how far.
  // The first to load shows at every distance until the other arrives.
  const lod = useRef<LOD>(null);
  useLayoutEffect(() => {
    if (!lod.current) return;
    const levels = lod.current.children.map((object, i) => ({ object, distance: i === 0 ? 0 : SPIRIT_NEAR, hysteresis: 0 }));
    lod.current.levels.splice(0, Infinity, ...levels);
  }, [fits]);
  const facing = Math.atan2(exhibit.roadX - exhibit.x, exhibit.roadZ - exhibit.z);
  return (
    <group position={[exhibit.x, 0, exhibit.z]}>
      <ExhibitPlaque exhibit={exhibit} title={spec.title} byline={spec.byline} body={spec.body} pick={SPIRIT_HEIGHT} />
      {fits.length ? (
        <group rotation={[0, facing, 0]}>
          <lOD ref={lod}>
            {fits.map((f) => (
              <group key={f.scene.uuid} position={f.offset} scale={f.scale}>
                <primitive object={f.scene} />
              </group>
            ))}
          </lOD>
          <UplightFixtures radius={exhibit.obstacle} count={4} pool={3} />
        </group>
      ) : null}
    </group>
  );
}

export function SpiritOfLife({ exhibit }: { exhibit: Exhibit }) {
  return <Spirit exhibit={exhibit} spec={LIFE} />;
}

export function SpiritOfInnovation({ exhibit }: { exhibit: Exhibit }) {
  return <Spirit exhibit={exhibit} spec={INNOVATION} />;
}
