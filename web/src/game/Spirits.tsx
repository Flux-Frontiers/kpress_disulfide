// Spirits from Art Techno (../art_techno, "The Gilded Circuit"), each in an
// exhibit glade of her own: the Spirit of Life, biology meets computation,
// holding the double helix as a staff, and the Spirit of Innovation, Eureka,
// springing forward as the idea ignites. Their models are Art Techno's, CC
// BY-NC 4.0 (see PROVENANCE.md), copied into public/models by `make art` and
// never committed; without one its glade shows only its plaque.

import { useEffect, useMemo, useState } from "react";
import { Box3, Mesh, MeshStandardMaterial, type Object3D, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { ASSET_ROOT } from "./ClassReader";
import { COARSE_POINTER } from "./Environment";
import type { Exhibit } from "./exhibits";
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
    "Eureka. She has just pressed two halves of a chip together at her heart, and the idea ignites: a " +
    "sunburst breaks out across her chest, and gold traces carry it down her arms and legs. She springs " +
    `forward with the joy of it, the only Spirit in motion. ${ART_TECHNO}.`,
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

/** Each model, fetched and fitted once: Art Techno's lighter export on a touch screen. */
const models = new Map<string, Promise<Fit>>();

function useSpiritModel(file: string): Fit | null {
  const [fit, setFit] = useState<Fit | null>(null);
  useEffect(() => {
    let live = true;
    let model = models.get(file);
    if (!model) {
      model = loader.loadAsync(`${ASSET_ROOT}models/${COARSE_POINTER ? "mobile/" : ""}${file}`).then((g) => fitSpirit(g.scene));
      models.set(file, model);
    }
    // Not there without `make art`: the glade keeps its plaque and no statue.
    model.then((f) => { if (live) setFit(f); }, () => {});
    return () => { live = false; };
  }, [file]);
  return fit;
}

/** A statue, fitted from her own bounds to SPIRIT_HEIGHT, standing on the ground, facing the road. */
function Spirit({ exhibit, spec }: { exhibit: Exhibit; spec: SpiritSpec }) {
  const fit = useSpiritModel(spec.model);
  const none = useMemo<MeshStandardMaterial[]>(() => [], []);
  useUplitMaterials(fit?.materials ?? none, "#ffe2b0", SPIRIT_GLOW.strength, SPIRIT_GLOW.falloff);
  const facing = Math.atan2(exhibit.roadX - exhibit.x, exhibit.roadZ - exhibit.z);
  return (
    <group position={[exhibit.x, 0, exhibit.z]}>
      <ExhibitPlaque exhibit={exhibit} title={spec.title} byline={spec.byline} body={spec.body} />
      {fit ? (
        <group rotation={[0, facing, 0]}>
          <group position={fit.offset} scale={fit.scale}>
            <primitive object={fit.scene} />
          </group>
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
