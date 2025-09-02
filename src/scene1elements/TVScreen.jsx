// TVScreen.jsx
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useGLTF, useTexture } from "@react-three/drei";

export default function TVScreen({
  isMobile,
  tvRef,
  modelUrl = "/models/TV.glb",

  // EITHER: dynamic map mode
  screenById = null, // { marketing: "/TVpics/marketing.png", ... }
  activeId = null,

  // OR: single image mode (optional)
  screenTextureUrl = null,

  // Target material name(s) inside the GLB
  // e.g., "Description" or ["Description","Button"]
  descriptionMatName = "Description",
}) {
  const { scene } = useGLTF(modelUrl);
  const tv = useMemo(() => scene.clone(true), [scene]);

  // --- choose texture ---
  const ids = useMemo(
    () => (screenById ? Object.keys(screenById) : []),
    [screenById]
  );
  const urls = useMemo(
    () => (screenById ? ids.map((k) => screenById[k]) : []),
    [ids, screenById]
  );

  const loadedArray = useTexture(urls.length ? urls : ["/__noop__.png"]);
  const chosenFromMap = useMemo(() => {
    if (!screenById || !activeId || !ids.length) return null;
    const idx = ids.indexOf(activeId);
    if (idx < 0) return null;
    return loadedArray[idx] || null;
  }, [screenById, activeId, ids, loadedArray]);

  const singleTex =
    !screenById && screenTextureUrl ? useTexture(screenTextureUrl) : null;
  const tex = screenById ? chosenFromMap : singleTex;

  if (tex?.isTexture) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
  }

  // --- targeting helpers ---
  const targetNames = useMemo(() => {
    const arr = Array.isArray(descriptionMatName)
      ? descriptionMatName
      : [descriptionMatName];
    return arr.map((n) => String(n || "").toLowerCase());
  }, [descriptionMatName]);

  // Keep references to the actual materials we should update on every change
  const targetsRef = useRef([]); // array of { obj, index, mat }

  // --- helpers ---
  function makeChecker(n = 10) {
    const s = 256,
      c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d"),
      w = s / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        g.fillStyle = (x + y) % 2 ? "#fff" : "#000";
        g.fillRect(x * w, y * w, w, w);
      }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function fitTextureToGeom(map, geom, mode = "cover") {
    if (!map || !geom) return;
    geom.computeBoundingBox();
    const size = new THREE.Vector3();
    geom.boundingBox.getSize(size);
    const geomAspect = size.x / size.y;

    const img = map.image;
    if (!img) return;
    const texAspect = img.width / img.height;

    map.center.set(0.5, 0.5);

    let sx = 1,
      sy = 1;
    if (mode === "cover") {
      if (texAspect > geomAspect) {
        // image wider → crop sides
        sx = geomAspect / texAspect;
        sy = 1;
      } else {
        // image taller → crop top/bottom
        sx = 1;
        sy = texAspect / geomAspect;
      }
    } else {
      // "contain"
      if (texAspect > geomAspect) {
        // letterbox top/bottom
        sx = 1;
        sy = texAspect / geomAspect;
      } else {
        // pillarbox sides
        sx = geomAspect / texAspect;
        sy = 1;
      }
    }

    map.repeat.set(sx, sy);
    map.offset.set((1 - sx) / 2, (1 - sy) / 2);
    map.needsUpdate = true;
  }

  // 1) Collect/replace target materials once per model / mat names
  useEffect(() => {
    targetsRef.current = [];

    tv.traverse((obj) => {
      if (!obj.isMesh) return;

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      // Dump mesh + mat names to confirm structure

      let changed = false;

      mats.forEach((m, i) => {
        if (!m) return;
        const name = (m.name || "").toLowerCase();
        const isTarget =
          targetNames.includes(name) || m.userData?.__tvDescription === true;

        if (isTarget) {
          if (!m.isMeshBasicMaterial) {
            // Replace with MeshBasic (no lighting issues), preserve name
            const newMat = new THREE.MeshBasicMaterial({ toneMapped: false });
            newMat.name = m.name || descriptionMatName;
            newMat.userData.__tvDescription = true;
            newMat.map = tex || null;

            mats[i] = newMat;
            targetsRef.current.push({ obj, index: i, mat: newMat });
            changed = true;
          } else {
            // Already ours
            m.userData.__tvDescription = true;
            targetsRef.current.push({ obj, index: i, mat: m });
          }
        }
      });

      if (changed) obj.material = Array.isArray(obj.material) ? mats : mats[0];
    });
  }, [tv, targetNames, descriptionMatName, tex]);

  // 2) Measure slots (Button/Description/Game) — DO NOT clear targetsRef here
  useEffect(() => {
    tv.traverse((obj) => {
      if (!obj.isMesh) return;

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];

      mats.forEach((m) => {
        if (!m) return;
        const name = (m.name || "").toLowerCase();

        if (["button", "description", "game"].includes(name)) {
          const geom = obj.geometry;
          geom.computeBoundingBox();
          geom.computeBoundingSphere();

          const bbox = geom.boundingBox;
          const size = new THREE.Vector3();
          bbox.getSize(size);

          const sig = (num) => Number.parseFloat(num.toPrecision(2));
          const aspect =
            size.y !== 0
              ? Number.parseFloat((size.x / size.y).toPrecision(2))
              : 0;
        }
      });
    });
  }, [tv]);

  // 3) Apply texture (or checker) + fit + per-target logs
  useEffect(() => {
    const img = tex?.image || null;

    const fallback = makeChecker(12);

    targetsRef.current.forEach(({ mat, obj }) => {
      const hasUV = !!obj.geometry.attributes.uv;

      const map = img && hasUV ? tex : fallback;

      map.colorSpace = THREE.SRGBColorSpace;
      map.minFilter = THREE.LinearFilter;
      map.magFilter = THREE.LinearFilter;
      map.wrapS = map.wrapT = THREE.RepeatWrapping;

      fitTextureToGeom(map, obj.geometry, "cover");

      // map.repeat.x *= -1;
      // // map.offset.x = 1 - map.offset.x; // compensate for negative repeat
      // map.needsUpdate = true;

      mat.map = map;
      // ensure no color tint over the texture
      if (mat.color && mat.color.isColor) mat.color.set("#ffffff");
      mat.needsUpdate = true;

      // per-target geometry aspect for quick fit check
      const bb =
        obj.geometry.boundingBox ||
        (obj.geometry.computeBoundingBox(), obj.geometry.boundingBox);
      const size = new THREE.Vector3();
      bb.getSize(size);
    });
  }, [tex, activeId]);

  const scale = isMobile ? 1 : 2;

  return (
    <group
      ref={tvRef}
      position={[0, 0, -10]}
      scale={scale}
      rotation={[0, Math.PI, 0]}
      dispose={null}
    >
      <primitive object={tv} />
    </group>
  );
}

useGLTF.preload("/models/TV.glb");
