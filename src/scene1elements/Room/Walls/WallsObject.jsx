// scene1elements/Room/Walls.jsx
import * as THREE from "three";
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";

export default function WallsObject({
  url = "/models/Wall_BakedTest.glb",
  position = [0, -0.5, 0],
  rotation = [0, 0, 0],
  scale = 1.1,
  doubleSided = false, // set true only if you really need the inside/back
  castShadow = true,
  receiveShadow = true,
}) {
  const { scene } = useGLTF(url);

  const wall = useMemo(() => {
    if (!scene) return null;
    const clone = scene.clone(true);
    clone.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = castShadow;
      o.receiveShadow = receiveShadow;

      const m = o.material;
      if (m?.map?.isTexture) {
        m.map.colorSpace = THREE.SRGBColorSpace;
        m.map.needsUpdate = true;
      }
      if (m) m.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide; // ← key
    });
    return clone;
  }, [scene, castShadow, receiveShadow, doubleSided]);

  if (!wall) return null;
  return (
    <primitive
      object={wall}
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{ exportNote: "Baked wall from GLB" }}
    />
  );
}

useGLTF.preload("/models/Wall_BakedTest.glb");
