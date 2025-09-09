// src/scene1elements/GodRaysReversed.jsx
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";

const GODRAYS_REVERSED_PATH = "/models/GodRaysReversed.glb";

export default function GodRaysReversed({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
}) {
  const { scene } = useGLTF(GODRAYS_REVERSED_PATH);

  const clone = useMemo(() => {
    if (!scene) return null;
    const s = scene.clone(true);
    s.traverse((o) => {
      if (o.isMesh && o.material) {
        o.material.transparent = true;
        o.material.opacity = 0.7;
        o.material.depthWrite = false;
        o.material.side = THREE.DoubleSide;
        o.material.toneMapped = false;
        o.material.blending = THREE.AdditiveBlending;

        if (o.material.emissive) {
          o.material.emissive = new THREE.Color("white");
          o.material.emissiveIntensity = 0.9;
        }

        o.material.polygonOffset = true;
        o.material.polygonOffsetFactor = -1;
        o.material.polygonOffsetUnits = -1;
        o.renderOrder = 2;
      }
    });
    s.traverse((o) => (o.frustumCulled = false));
    return s;
  }, [scene]);

  if (!clone) return null;

  return (
    <primitive
      object={clone}
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{ exportNote: "Baked god rays reversed" }}
    />
  );
}

// Preload the model for faster loading
useGLTF.preload(GODRAYS_REVERSED_PATH);
