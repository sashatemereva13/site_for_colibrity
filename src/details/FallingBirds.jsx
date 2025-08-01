// details/FallingBirds.jsx
import { useGLTF, Instances, Instance } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRef, useEffect, useState } from "react";

export default function FallingBirds({ scroll }) {
  const { scene } = useGLTF("/models/hummingbird.glb");
  useGLTF.preload("/models/hummingbird.glb");

  const [mesh, setMesh] = useState(null);
  const groupRef = useRef();

  // Extract mesh from loaded scene
  useEffect(() => {
    let firstMesh = null;
    scene.traverse((child) => {
      if (child.isMesh && !firstMesh) {
        firstMesh = child;
      }
    });
    setMesh(firstMesh);
  }, [scene]);

  // Generate 30 seat positions
  const birds = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      const x = col * 1.2 - 3;
      const z = 1.5 + row * 1.2;
      birds.push({ x, z });
    }
  }

  // Animate falling motion on scroll
  useFrame(() => {
    const t = scroll.offset;
    birds.forEach((bird, i) => {
      const localT = THREE.MathUtils.clamp((t - 0.1) * 2, 0, 1);
      const y = THREE.MathUtils.lerp(5, 0.6, localT);

      const instance = groupRef.current?.children[i];
      if (instance) {
        instance.position.set(bird.x, y, bird.z);
        instance.rotation.set(0, Math.PI, 0);
        instance.scale.set(0.2, 0.2, 0.2);
      }
    });
  });

  // If mesh not ready yet, don't render
  if (!mesh) return null;

  return (
    <Instances geometry={mesh.geometry} material={mesh.material} ref={groupRef}>
      {birds.map((_, i) => (
        <Instance key={i} />
      ))}
    </Instances>
  );
}
