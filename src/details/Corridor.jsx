// details/Corridor.jsx
import { useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export default function Corridor() {
  const groupRef = useRef();
  const scroll = useScroll();

  useFrame(() => {
    const t = scroll.offset;
    // Fade corridor out between t=0.15 → 0.25 for a smooth transition
    if (groupRef.current) {
      groupRef.current.visible = t <= 0.25;
      groupRef.current.children.forEach((child) => {
        if (child.material) {
          child.material.opacity =
            t <= 0.15 ? 1 : Math.max(0, 1 - (t - 0.15) / 0.1);
          child.material.transparent = true;
          child.material.depthWrite = true;
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 52]}>
      {/* Floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[6, 80]} />
        <meshStandardMaterial color="#a29483" />
      </mesh>

      {/* Door */}
      <mesh position={[0, 3.5, -40]}>
        <planeGeometry args={[6, 7]} />
        <meshStandardMaterial color="#fbe6d8" />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 7, 0]}>
        <planeGeometry args={[24, 80]} />
        <meshStandardMaterial color="#e5d9c9" />
      </mesh>

      {/* Left wall */}
      <mesh
        receiveShadow
        castShadow
        rotation={[Math.PI / 2, Math.PI / 2, 0]}
        position={[-3, 2, 0]}
      >
        <planeGeometry args={[10, 80]} />
        <meshStandardMaterial color="#d8c7b4" />
      </mesh>

      {/* Right wall */}
      <mesh
        receiveShadow
        castShadow
        rotation={[-Math.PI / 2, -Math.PI / 2, 0]}
        position={[3, 2, 0]}
      >
        <planeGeometry args={[10, 80]} />
        <meshStandardMaterial color="#d8c7b4" />
      </mesh>
    </group>
  );
}
