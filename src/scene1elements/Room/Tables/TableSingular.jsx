// src/components/Tables.jsx
import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export default function TableSingular({
  position = [0, -1, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) {
  // Load the GLB model
  const { scene } = useGLTF("/models/TableSingular.glb");

  // Clone once to avoid modifying the original scene
  const clone = useMemo(() => {
    const clonedScene = scene.clone(true);
    clonedScene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (obj.material) {
          obj.material.side = THREE.DoubleSide;
        }
      }
    });
    return clonedScene;
  }, [scene]);

  return (
    <primitive
      object={clone}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

// Preload model for faster loading
useGLTF.preload("/models/TableSingular.glb");
