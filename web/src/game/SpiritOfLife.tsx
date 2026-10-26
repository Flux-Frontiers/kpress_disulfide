// The Spirit of Life, from Art Techno (../art_techno, "The Gilded Circuit"):
// one of its nine Spirits, biology meets computation, holding the double helix
// as a staff. Her model is Art Techno's, CC BY-NC 4.0 (see PROVENANCE.md),
// copied into public/models by `make art` and never committed; without it the
// glade shows only her plaque.

import { useEffect, useMemo, useState } from "react";
import { Box3, Mesh, MeshStandardMaterial, type Object3D, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { ASSET_ROOT } from "./ClassReader";
import { COARSE_POINTER } from "./Environment";
import type { Exhibit } from "./exhibits";
import { ExhibitPlaque } from "./Signposts";
import { UplightFixtures, useUplitMaterials } from "./Uplights";

/** Her height, m: about the database tree's, mid-range among the class trees. */
export const LIFE_HEIGHT = 10;
/** The floodlights at her foot: warm, reaching about half her height. */
const LIFE_GLOW = { strength: 0.35, falloff: 5 };

const LIFE_BODY =
  "Life written in code. She holds the double helix as a staff whose strands feed a chip at its " +
  "crown, and the chip radiates like the rising sun. In her open palm rests a glowing cell. She is " +
  "one of the nine Spirits of Art Techno, which does for the computer age what Art Deco did for " +
  "the machine age: here, among the disulfides, biology meets computation.";

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
/** The model, fetched once: Art Techno's lighter export on a touch screen. */
let model: Promise<Object3D> | null = null;

function useLifeModel(): Object3D | null {
  const [scene, setScene] = useState<Object3D | null>(null);
  useEffect(() => {
    let live = true;
    model ??= loader.loadAsync(`${ASSET_ROOT}models/${COARSE_POINTER ? "mobile/" : ""}life.glb`).then((g) => g.scene);
    // Not there without `make art`: the glade keeps its plaque and no statue.
    model.then((s) => { if (live) setScene(s); }, () => {});
    return () => { live = false; };
  }, []);
  return scene;
}

/** The statue, fitted from her own bounds to LIFE_HEIGHT, standing on the ground, facing the road. */
export function SpiritOfLife({ exhibit }: { exhibit: Exhibit }) {
  const scene = useLifeModel();
  const fit = useMemo(() => {
    if (!scene) return null;
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3()), centre = box.getCenter(new Vector3());
    const scale = LIFE_HEIGHT / size.y;
    const materials: MeshStandardMaterial[] = [];
    scene.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      o.castShadow = o.receiveShadow = true;
      for (const m of [o.material].flat()) if (m instanceof MeshStandardMaterial) materials.push(m);
    });
    return { scale, offset: [-centre.x * scale, -box.min.y * scale, -centre.z * scale] as const, materials };
  }, [scene]);
  useUplitMaterials(fit?.materials ?? [], "#ffe2b0", LIFE_GLOW.strength, LIFE_GLOW.falloff);
  const facing = Math.atan2(exhibit.roadX - exhibit.x, exhibit.roadZ - exhibit.z);
  return (
    <group position={[exhibit.x, 0, exhibit.z]}>
      <ExhibitPlaque exhibit={exhibit} title="Spirit of Life" byline="Art Techno · Biology meets computation" body={LIFE_BODY} />
      {scene && fit ? (
        <group rotation={[0, facing, 0]}>
          <group position={fit.offset} scale={fit.scale}>
            <primitive object={scene} />
          </group>
          <UplightFixtures radius={exhibit.obstacle} count={4} pool={3} />
        </group>
      ) : null}
    </group>
  );
}
