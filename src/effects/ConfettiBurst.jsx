import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function ConfettiBurst({ count = 50, area = [4, 4] }) {
  const particles = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = THREE.MathUtils.randFloatSpread(area[0]); // x
      positions[i * 3 + 1] = THREE.MathUtils.randFloatSpread(area[1]); // y
      positions[i * 3 + 2] = THREE.MathUtils.randFloatSpread(0.1); // z depth
      const color = new THREE.Color(`hsl(${Math.random() * 360}, 80%, 60%)`);
      colors.set([color.r, color.g, color.b], i * 3);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return geometry;
  }, [count, area]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const positions = particles.attributes.position.array;

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] -= 0.01; // fall
      positions[i * 3 + 0] += Math.sin(time + i) * 0.001; // drift
      if (positions[i * 3 + 1] < -2) {
        positions[i * 3 + 1] = 2; // reset to top
      }
    }
    particles.attributes.position.needsUpdate = true;
  });

  return (
    <points geometry={particles}>
      <pointsMaterial size={0.05} vertexColors transparent opacity={0.8} />
    </points>
  );
}
