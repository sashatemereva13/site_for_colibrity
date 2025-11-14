import { useGLTF } from "@react-three/drei";
import { forwardRef, useEffect } from "react";
import * as THREE from "three";

const Hummingbird = forwardRef((props, ref) => {
  const { scene } = useGLTF("/models/hummingbird.glb");

  useEffect(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        // Make material transparent
        child.material.transparent = true;
        child.material.opacity = props.opacity ?? 0.9;

        // Apply soft pink/purple tint
        child.material.color.set("#EAB48E"); // light pink
        child.material.emissive = new THREE.Color("#465F5F");
        child.material.emissiveIntensity = 0.15;

        child.material.needsUpdate = true;
      }
    });
  }, [scene, props.opacity]);

  return (
    <group ref={ref} position={props.position} {...props}>
      <primitive object={scene} scale={3} rotation={[0, Math.PI, 0]} />
      <directionalLight position={[5, 10, 5]} intensity={2} castShadow />
      <directionalLight position={[-5, 10, 5]} intensity={1} castShadow />
      <spotLight
        position={[0, -7, 5]}
        intensity={2}
        angle={Math.PI / 3}
        penumbra={0.5}
        color="#f9d0e8" // gentle pinkish highlight
        target-position={[0, 0, 0]}
      />
    </group>
  );
});

export default Hummingbird;
