// TVScreen.jsx
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useGLTF, useTexture } from "@react-three/drei";

export default function TVScreen({
  isMobile,
  tvRef,

  // desktop model stays your default
  modelUrl = "/models/TV.glb",
  // add a mobile override
  mobileModelUrl = "/models/iPhoneGame.glb",

  screenById = null,
  activeId = null,
  screenTextureUrl = null,
  descriptionMatName = "Description",
}) {
  // ⬇️ choose model by device (everything else unchanged)
  const selectedModelUrl = isMobile ? mobileModelUrl : modelUrl;

  const { scene } = useGLTF(selectedModelUrl);
  const tv = useMemo(() => scene.clone(true), [scene]);

  // --- choose texture (unchanged) ---
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

  const targetNames = useMemo(() => {
    const arr = Array.isArray(descriptionMatName)
      ? descriptionMatName
      : [descriptionMatName];
    return arr.map((n) => String(n || "").toLowerCase());
  }, [descriptionMatName]);

  const targetsRef = useRef([]);

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
        sx = geomAspect / texAspect;
        sy = 1;
      } else {
        sx = 1;
        sy = texAspect / geomAspect;
      }
    } else {
      if (texAspect > geomAspect) {
        sx = 1;
        sy = texAspect / geomAspect;
      } else {
        sx = geomAspect / texAspect;
        sy = 1;
      }
    }
    map.repeat.set(sx, sy);
    map.offset.set((1 - sx) / 2, (1 - sy) / 2);
    map.needsUpdate = true;
  }

  useEffect(() => {
    targetsRef.current = [];
    tv.traverse((obj) => {
      if (!obj.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      let changed = false;
      mats.forEach((m, i) => {
        if (!m) return;
        const name = (m.name || "").toLowerCase();
        const isTarget =
          targetNames.includes(name) || m.userData?.__tvDescription === true;
        if (isTarget) {
          if (!m.isMeshBasicMaterial) {
            const newMat = new THREE.MeshBasicMaterial({ toneMapped: false });
            newMat.name = m.name || descriptionMatName;
            newMat.userData.__tvDescription = true;
            newMat.map = tex || null;
            mats[i] = newMat;
            targetsRef.current.push({ obj, index: i, mat: newMat });
            changed = true;
          } else {
            m.userData.__tvDescription = true;
            targetsRef.current.push({ obj, index: i, mat: m });
          }
        }
      });
      if (changed) obj.material = Array.isArray(obj.material) ? mats : mats[0];
    });
  }, [tv, targetNames, descriptionMatName, tex]);

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
        }
      });
    });
  }, [tv]);

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
      if (mat.color && mat.color.isColor) mat.color.set("#ffffff");
      mat.map = map;
      mat.needsUpdate = true;
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
      {/* key ensures re-mount when switching modelUrl */}
      <primitive object={tv} key={selectedModelUrl} />
    </group>
  );
}

// Preload both models so switching is instant
useGLTF.preload("/models/TV.glb");
useGLTF.preload("/models/iPhoneGame.glb");
