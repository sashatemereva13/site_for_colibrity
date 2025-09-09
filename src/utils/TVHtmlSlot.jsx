// src/utils/TVHtmlSlot.jsx
import * as THREE from "three";
import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";

export default function TVHtmlSlot({
  tvRoot,
  materialName = "Game",
  screenMeshName = "screen",
  BASE_W = 700,
  BASE_H = 900,
  isMobile = false,
  offset = 0.002,
  children,
  ...htmlProps // forwarded to <Html/>
}) {
  const { scene } = useThree();

  const finalBaseW = BASE_W ?? (isMobile ? 500 : 700);
  const finalBaseH = BASE_H ?? (isMobile ? 600 : 900);

  const [target, setTarget] = useState(() => ({
    mesh: null,
    centerLocal: new THREE.Vector3(),
    sizeLocal: new THREE.Vector2(1, 1),
  }));

  // Hooks declared unconditionally (no early return before these)
  const normalLocal = useMemo(() => new THREE.Vector3(0, 0, 1), []);

  useEffect(() => {
    const root = tvRoot?.current || scene;
    if (!root) return;

    const meshes = [];
    root.traverse((o) => o.isMesh && meshes.push(o));

    const nameMatch = (o) =>
      (o.name || "").toLowerCase().includes(screenMeshName.toLowerCase());
    const pool = meshes.filter(nameMatch);
    const search = pool.length ? pool : meshes;

    const matsToLower = (m) =>
      (Array.isArray(m) ? m : [m]).map((mm) => (mm?.name || "").toLowerCase());

    let foundMesh = null;
    let foundGroup = null;

    for (const m of search) {
      const mats = matsToLower(m.material);
      const idx = mats.indexOf(materialName.toLowerCase());
      if (idx === -1) continue;
      foundMesh = m;
      foundGroup =
        m.geometry?.groups?.find((g) => g.materialIndex === idx) || null;
      break;
    }

    if (!foundMesh) {
      console.warn(`[TVHtmlSlot] material "${materialName}" not found.`);
      setTarget((t) => ({ ...t, mesh: null }));
      return;
    }

    // Collect vertices for the chosen region (group or whole mesh)
    const geom = foundMesh.geometry;
    const pos = geom.attributes.position;
    const idxAttr = geom.index;
    const pts = [];

    const pushV = (vi) =>
      pts.push(new THREE.Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi)));

    if (foundGroup) {
      const { start, count } = foundGroup;
      if (idxAttr)
        for (let i = start; i < start + count; i++) pushV(idxAttr.getX(i));
      else {
        const end = Math.min(pos.count, start + count);
        for (let vi = start; vi < end; vi++) pushV(vi);
      }
    } else {
      if (idxAttr)
        for (let i = 0; i < idxAttr.count; i++) pushV(idxAttr.getX(i));
      else for (let vi = 0; vi < pos.count; vi++) pushV(vi);
    }

    if (pts.length < 3) {
      setTarget((t) => ({ ...t, mesh: null }));
      return;
    }

    const bbox = new THREE.Box3().setFromPoints(pts);
    const centerLocal = bbox.getCenter(new THREE.Vector3());
    const size3 = bbox.getSize(new THREE.Vector3());
    const sizeLocal = new THREE.Vector2(size3.x, size3.y);

    setTarget({ mesh: foundMesh, centerLocal, sizeLocal });
  }, [scene, tvRoot, materialName, screenMeshName]);

  // Compute values with safe fallbacks to keep hook order stable
  const worldWidth = Math.max(0.0001, target.sizeLocal.x || 1);
  const defaultDF = BASE_W / worldWidth;
  const distanceFactor = htmlProps.distanceFactor ?? defaultDF;

  const ox = normalLocal.x * offset;
  const oy = normalLocal.y * offset;
  const oz = normalLocal.z * offset;

  const cx = target.centerLocal?.x ?? 0;
  const cy = target.centerLocal?.y ?? 0;
  const cz = target.centerLocal?.z ?? 0;

  return (
    <group>
      {target.mesh && (
        <primitive object={target.mesh}>
          <Html
            transform
            occlude
            {...htmlProps}
            distanceFactor={distanceFactor}
            position={[cx + ox, cy + oy, cz + oz]}
            zIndexRange={[10, 0]}
            style={{
              width: `${finalBaseW}px`,
              height: `${finalBaseH}px`,
              pointerEvents: "auto",
              ...(htmlProps.style || {}),
            }}
          >
            {children}
          </Html>
        </primitive>
      )}
    </group>
  );
}
