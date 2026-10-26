import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Color, CylinderGeometry, InstancedMesh, MeshStandardMaterial, Object3D, Quaternion, SphereGeometry, Vector3 } from "three";
import { loadAtoms, loadBond, type AtomsTable, type BondCard } from "./classCatalog";
import { HUB_PLAQUE_DIR, HUB_PLAQUE_DIST, MONUMENT_PLINTH, MONUMENT_SCALE, moleculeExtent, type Forest, type MoleculeSite } from "./forest";
import { bondName } from "./classCards";
import { ballAndStick, type Ball, type Stick } from "./molecule";
import { Lectern } from "./Signposts";
import { useGame } from "./store";

const o = new Object3D();
const up = new Vector3(0, 1, 0);
const dir = new Vector3();
const quat = new Quaternion();
const tint = new Color();

/** atoms.json, fetched once per database. */
let atomsCache: { base: string; loaded: Promise<AtomsTable> } | null = null;
export function useAtoms(base: string): AtomsTable | null {
  const [atoms, setAtoms] = useState<AtomsTable | null>(null);
  useEffect(() => {
    let live = true;
    if (atomsCache?.base !== base) atomsCache = { base, loaded: loadAtoms(base) };
    atomsCache.loaded.then((a) => { if (live) setAtoms(a); }, () => {});
    return () => { live = false; };
  }, [base]);
  return atoms;
}

/** The home disulfide's bond card. */
function useBond(base: string, key: string): BondCard | null {
  const [bond, setBond] = useState<BondCard | null>(null);
  useEffect(() => {
    let live = true;
    setBond(null);
    loadBond(base, key).then((b) => { if (live) setBond(b); }, () => {});
    return () => { live = false; };
  }, [base, key]);
  return bond;
}

/** Balls and sticks as two instanced meshes, each instance in its atom's color. */
export function BallAndStickMesh({ balls, sticks }: { balls: Ball[]; sticks: Stick[] }) {
  const ballRef = useRef<InstancedMesh>(null);
  const stickRef = useRef<InstancedMesh>(null);
  const geoms = useMemo(() => ({
    ball: new SphereGeometry(1, 20, 14),
    // A unit cylinder along y, from y = 0 to y = 1: a stick is a scale and a turn.
    stick: new CylinderGeometry(1, 1, 1, 12, 1, true).translate(0, 0.5, 0),
  }), []);
  // Specular, as _render_ss's spheres are.
  const material = useMemo(() => new MeshStandardMaterial({ roughness: 0.35, metalness: 0.05 }), []);
  useEffect(() => () => { geoms.ball.dispose(); geoms.stick.dispose(); material.dispose(); }, [geoms, material]);
  useLayoutEffect(() => {
    const mesh = ballRef.current;
    if (!mesh) return;
    balls.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z);
      o.quaternion.identity();
      o.scale.setScalar(b.r);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, tint.set(b.color));
    });
    mesh.count = balls.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [balls]);
  useLayoutEffect(() => {
    const mesh = stickRef.current;
    if (!mesh) return;
    let k = 0;
    for (const s of sticks) {
      dir.set(s.bx - s.ax, s.by - s.ay, s.bz - s.az);
      const len = dir.length();
      if (len < 1e-6) continue;
      o.position.set(s.ax, s.ay, s.az);
      o.quaternion.copy(quat.setFromUnitVectors(up, dir.divideScalar(len)));
      o.scale.set(s.r, len, s.r);
      o.updateMatrix();
      mesh.setMatrixAt(k, o.matrix);
      mesh.setColorAt(k, tint.set(s.color));
      k++;
    }
    mesh.count = k;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [sticks]);
  return (
    <group>
      <instancedMesh ref={ballRef} args={[geoms.ball, material, Math.max(1, balls.length)]} castShadow receiveShadow />
      <instancedMesh ref={stickRef} args={[geoms.stick, material, Math.max(1, sticks.length)]} castShadow receiveShadow />
    </group>
  );
}

/** A slate plinth from the ground to `top`, `r` across. */
function Plinth({ x, z, top, r }: { x: number; z: number; top: number; r: number }) {
  return (
    <mesh position={[x, top / 2, z]} castShadow receiveShadow>
      <cylinderGeometry args={[r * 0.85, r, top, 24]} />
      <meshStandardMaterial color="#5d636b" roughness={0.8} metalness={0.05} />
    </mesh>
  );
}

/**
 * The model disulfides in the orchard: each grove's representative on its
 * stop plaza and each tree's consensus model at its foot, on plinths, all in
 * one pair of instanced meshes.
 */
export function Molecules({ forest }: { forest: Forest }) {
  const base = useGame((s) => s.familyBase);
  const atoms = useAtoms(base);
  const drawn = useMemo(() => {
    if (!atoms) return null;
    const balls: Ball[] = [], sticks: Stick[] = [];
    for (const m of forest.molecules) {
      const one = ballAndStick(m.model, atoms, m);
      balls.push(...one.balls);
      sticks.push(...one.sticks);
    }
    return { balls, sticks };
  }, [forest, atoms]);
  return (
    <group>
      {forest.molecules.map((m: MoleculeSite) => (
        <Plinth key={`${m.kind}:${m.of}`} x={m.x} z={m.z} top={m.plinth}
          r={m.kind === "representative" ? 0.55 : 0.16} />
      ))}
      {drawn ? <BallAndStickMesh balls={drawn.balls} sticks={drawn.sticks} /> : null}
    </group>
  );
}

const MONUMENT_BODY =
  "The home disulfide, drawn ball-and-stick from its own coordinates in the Protein Data Bank, one " +
  "angstrom to 35 cm. Behind it stands the database tree: every bond in the trunk and the 32 binary " +
  "classes as its limbs, each as thick as the bonds it carries and leafed in its family's color. Each " +
  "binary class grows as its own tree out in the groves. Click a limb to go to its tree, or press B to " +
  "browse every class.";

/** The home disulfide at monument scale on the hub plaza, with its plaque. */
export function Monument({ forest }: { forest: Forest }) {
  const base = useGame((s) => s.familyBase);
  const atoms = useAtoms(base);
  const bond = useBond(base, forest.corpusTree.focal);
  const { x, z, yaw } = forest.monument;
  const drawn = useMemo(() => {
    if (!atoms || !bond) return null;
    const y = MONUMENT_PLINTH + moleculeExtent(bond) * MONUMENT_SCALE;
    return ballAndStick(bond, atoms, { x, y, z, yaw, scale: MONUMENT_SCALE });
  }, [atoms, bond, x, z, yaw]);
  const px = Math.cos(HUB_PLAQUE_DIR) * HUB_PLAQUE_DIST;
  const pz = Math.sin(HUB_PLAQUE_DIR) * HUB_PLAQUE_DIST;
  const title = bond ? bondName(bond) : forest.corpusTree.focal;
  const byline = bond
    ? `${bond.energy.toFixed(2)} kcal/mol · Ca ${bond.ca_distance.toFixed(2)} Å · ${bond.classes.octant} · ${forest.corpusTree.focalName}`
    : forest.corpusTree.focalName;
  return (
    <group>
      <Plinth x={x} z={z} top={MONUMENT_PLINTH} r={1.3} />
      {drawn ? <BallAndStickMesh balls={drawn.balls} sticks={drawn.sticks} /> : null}
      <group position={[px, 0, pz]} rotation={[0, Math.atan2(px, pz), 0]}
        onClick={(e) => { e.stopPropagation(); useGame.getState().openCatalog(null); }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = ""; }}>
        <Lectern title={title} byline={byline} body={MONUMENT_BODY} />
      </group>
    </group>
  );
}
