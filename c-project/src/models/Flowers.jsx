import { useGLTF, useScroll } from "@react-three/drei";
import { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function FlowersGroup() {
  const scroll = useScroll();
  const { scene } = useGLTF("/models/flowers/2.glb");

  const NUM_CLONES = 7;
  const flowerClones = useRef([]);
  const anglesRef = useRef([]);
  const initialPositions = useRef([]);

  useEffect(() => {
    const spacing = 20;
    const baseY = -35;
    const baseZ = 0;
    const clones = [];
    const angles = [];
    const positions = [];

    for (let i = 0; i < NUM_CLONES; i++) {
      const clone = scene.clone(true);

      clone.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0;
          child.material.color.set("#FF8C4F");
        }
      });

      const x = (i - (NUM_CLONES - 1) / 2) * spacing;
      const y = baseY;
      const z = baseZ;

      clone.position.set(x, y, z);
      clone.rotation.y = Math.PI;
      clone.scale.setScalar(20);

      clones.push(clone);
      angles.push((i / NUM_CLONES) * Math.PI * 2);
      positions.push(new THREE.Vector3(x, y, z));
    }

    flowerClones.current = clones;
    anglesRef.current = angles;
    initialPositions.current = positions;
  }, [scene]);

  useFrame(() => {
    const t = scroll.offset;

    const fadeStart = 0;
    const fadeEnd = 2.5;

    const orbitStart = 0;
    const orbitEnd = 0.7;

    const fadeProgress = THREE.MathUtils.clamp(
      (t - fadeStart) / (fadeEnd - fadeStart),
      0,
      1
    );

    const orbitProgress = THREE.MathUtils.clamp(
      (t - orbitStart) / (orbitEnd - orbitStart),
      0,
      1
    );

    const radius = 20;

    flowerClones.current.forEach((clone, i) => {
      // Opacity
      clone.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.opacity = fadeProgress;
        }
      });

      // Calculate orbit position
      const angle = anglesRef.current[i] + orbitProgress * Math.PI * 0.25;
      const orbitX = Math.cos(angle) * radius;
      const orbitZ = Math.sin(angle) * radius - 20;

      const tiltAmount = 1.5;
      const tiltPhase = i % 2 === 0 ? 0 : Math.PI; // alternate ring direction if needed

      const orbitY = Math.sin(angle + tiltPhase) * tiltAmount + i - 10;

      const orbitTarget = new THREE.Vector3(orbitX, orbitY, orbitZ);
      const initialTarget = initialPositions.current[i];

      // Interpolate between original and orbit position
      const blended = new THREE.Vector3().lerpVectors(
        initialTarget,
        orbitTarget,
        orbitProgress
      );

      clone.position.lerp(blended, 0.02); // Smooth transition
      clone.rotation.y += 0.005 * orbitProgress; // Only spin when orbiting
    });
  });

  return (
    <>
      {flowerClones.current.map((clone, i) => (
        <primitive key={i} object={clone} />
      ))}
    </>
  );
}
