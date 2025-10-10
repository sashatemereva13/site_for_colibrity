// src/components/FloorGLB.jsx
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";

/**
 * FloorGLB
 * - Loads a baked floor GLB and prepares materials/textures.
 * - Safe to reuse multiple times (clones the original scene).
 */
export default function FloorGLB({
  url = "/models/Floor.glb",
  position = [0, -3.001, 0], // tiny offset to avoid z-fighting
  rotation = [0, 0, 0], // e.g. [0, Math.PI/6, 0] for 30°
  scale = [1, 1, 1],
  castShadow = false,
  receiveShadow = true,
  doubleSide = true,
  toneMapped = true, // set false if you want a pure UI-like look
  onLoaded = null, // callback(clone) after it’s prepared
}) {
  const { scene } = useGLTF(url);

  const clone = useMemo(() => {
    if (!scene) return null;
    const c = scene.clone(true);

    c.traverse((o) => {
      if (!o.isMesh) return;

      // Shadows
      o.castShadow = castShadow;
      o.receiveShadow = receiveShadow;

      const m = o.material;
      if (!m) return;

      // Texture color space sanity
      if (m.map?.isTexture) {
        m.map.colorSpace = THREE.SRGBColorSpace;
        m.map.needsUpdate = true;
      }
      if (m.emissiveMap?.isTexture) {
        m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
        m.emissiveMap.needsUpdate = true;
      }

      // Faces & tone mapping behavior
      m.side = doubleSide ? THREE.DoubleSide : THREE.FrontSide;
      m.toneMapped = toneMapped;
    });

    return c;
  }, [scene, castShadow, receiveShadow, doubleSide, toneMapped]);

  useEffect(() => {
    if (clone && onLoaded) onLoaded(clone);
  }, [clone, onLoaded]);

  if (!clone) return null;
  return (
    <primitive
      object={clone}
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{ exportNote: "Baked floor from GLB" }}
    />
  );
}

// Optional: Preload for faster first render
useGLTF.preload("/models/floor.glb");
