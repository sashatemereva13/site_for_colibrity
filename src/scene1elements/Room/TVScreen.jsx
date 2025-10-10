// TVScreen.jsx
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

export default function TVScreen({
  isMobile,
  tvRef,

  modelUrl = "/models/TV.glb",
  mobileModelUrl = "/models/iPhoneGame.glb",

  screenById = null,
  activeId = null,
  screenTextureUrl = null,

  descriptionMatName = ["Description", "Game"],

  // new props
  fitMode = "contain", // "cover" | "contain" | "stretch"
  align = "center", // "center" | "top" | "bottom" | "left" | "right"
  zoom, // >1 zoom in, <1 zoom out
}) {
  const selectedModelUrl = isMobile ? mobileModelUrl : modelUrl;
  const { scene } = useGLTF(selectedModelUrl);
  const tv = useMemo(() => scene.clone(true), [scene]);
  const levitateRef = useRef();

  useFrame((state) => {
    if (levitateRef.current) {
      const t = state.clock.getElapsedTime();
      levitateRef.current.position.y = Math.sin(t * 1.5) * 0.09;
    }
  });

  // --- pick texture based on activeId ---
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

  function fitTextureToGeom(
    map,
    geom,
    mode = "cover",
    align = "center",
    zoom = 1
  ) {
    if (!map || !geom) return;
    geom.computeBoundingBox();
    const size = new THREE.Vector3();
    geom.boundingBox.getSize(size);
    const geomAspect = size.x / size.y;

    const img = map.image;
    if (!img) return;
    const texAspect = img.width / img.height;

    map.center.set(-5.7, 0);

    let sx = 1,
      sy = 1;
    if (mode === "stretch") {
      sx = sy = 1;
    } else if (mode === "cover") {
      if (texAspect > geomAspect) {
        sx = geomAspect / texAspect;
        sy = 1;
      } else {
        sx = 1;
        sy = texAspect / geomAspect;
      }
    } else {
      // contain
      if (texAspect > geomAspect) {
        sx = 1;
        sy = texAspect / geomAspect;
      } else {
        sx = geomAspect / texAspect;
        sy = 1;
      }
    }

    // apply zoom
    sx /= zoom;
    sy /= zoom;

    map.repeat.set(sx, sy);

    let ox = (1 - sx) / 2;
    let oy = (1 - sy) / 2;

    if (align.includes("left")) ox = 0;
    if (align.includes("right")) ox = 1 - sx;
    if (align.includes("top")) oy = 1 - sy;
    if (align.includes("bottom")) oy = 0;

    map.offset.set(ox, oy);
    map.needsUpdate = true;
  }

  // swap out materials with MeshBasicMaterial
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

  // apply texture fitting
  useEffect(() => {
    if (!tex) return;
    targetsRef.current.forEach(({ mat, obj }) => {
      fitTextureToGeom(tex, obj.geometry, fitMode, align, zoom);
      if (mat.color && mat.color.isColor) mat.color.set("#ffffff");
      mat.map = tex;
      mat.needsUpdate = true;
    });
  }, [tex, activeId, fitMode, align, zoom]);

  const scale = 1;

  return (
    <group
      ref={tvRef}
      position={[0, 1, -10]}
      scale={scale}
      rotation={[0, 0, 0]}
      dispose={null}
    >
      <group ref={levitateRef}>
        <primitive object={tv} key={selectedModelUrl} />
      </group>
    </group>
  );
}

useGLTF.preload("/models/TV.glb");
useGLTF.preload("/models/iPhoneGame.glb");
