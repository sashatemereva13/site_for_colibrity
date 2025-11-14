import { useGLTF, useScroll } from "@react-three/drei";
import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function FlowerRing({
  count = 7,
  radius = 15,
  yPosition = 0,
  scrollRange = [0.7, 3],
  color = "#FF8C4F",
  triggered = true,
  onComplete,
}) {
  const scroll = useScroll();
  const { scene } = useGLTF("/models/flowers/2.glb");
  const flowerRingRef = useRef();

  const clonesRef = useRef([]);
  const completedRef = useRef(false);

  // Setup flowers
  useEffect(() => {
    if (!triggered) return;

    const clones = [];

    for (let i = 0; i < count; i++) {
      const clone = scene.clone(true);
      clone.scale.setScalar(13);
      clone.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0;
          child.material.color.set(color);
        }
      });

      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 20;
      const y = yPosition + Math.sin(angle * 1.5) * 1.5;

      clone.position.set(x, y, z);
      clones.push(clone);
    }

    clonesRef.current = clones;
  }, [scene, triggered]);

  // Animate orbit
  useFrame(() => {
    if (!triggered || clonesRef.current.length === 0) return;

    const t = scroll.offset;
    const [start, end] = scrollRange;
    const progress = THREE.MathUtils.clamp((t - start) / (end - start), 0, 1);

    // group rotation
    flowerRingRef.current.rotation.y = progress * Math.PI * 0.5;

    clonesRef.current.forEach((clone, i) => {
      clone.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.opacity = progress;
        }
      });

      clone.rotation.y += 0.003 * progress;
    });

    // Notify once orbit is complete
    if (
      progress === 1 &&
      !completedRef.current &&
      typeof onComplete === "function"
    ) {
      onComplete();
      completedRef.current = true;
    }
  });

  return (
    <>
      {triggered && (
        <group ref={flowerRingRef}>
          {clonesRef.current.map((clone, i) => (
            <primitive key={i} object={clone} />
          ))}
        </group>
      )}
    </>
  );
}
