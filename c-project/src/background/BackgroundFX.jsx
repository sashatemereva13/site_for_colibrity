// components/BackgroundFX.jsx
import { useRef, useEffect, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SPARK_COUNT = 80;
const mouseUV = new THREE.Vector2(0.5, 0.5);

export default function BackgroundFX() {
  const pointsRef = useRef();
  const { viewport, size, camera } = useThree();

  const trail = useRef(
    Array.from({ length: SPARK_COUNT }, () => new THREE.Vector2(0.5, 0.5))
  );

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight; // Flip Y
      mouseUV.set(x, y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Geometry & color data memoized
  const geometry = useMemo(() => {
    const positions = new Float32Array(SPARK_COUNT * 3);
    const colors = new Float32Array(SPARK_COUNT * 3);

    for (let i = 0; i < SPARK_COUNT; i++) {
      const i3 = i * 3;
      positions[i3 + 0] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;

      colors[i3 + 0] = 1.0;
      colors[i3 + 1] = 0.6 + Math.random() * 0.4;
      colors[i3 + 2] = 0.2 + Math.random() * 0.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return geo;
  }, []);

  // Animate the trail
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    // Update the trail
    for (let i = SPARK_COUNT - 1; i > 0; i--) {
      trail.current[i].copy(trail.current[i - 1]);
    }
    trail.current[0].lerp(mouseUV, 0.2);

    // Update positions
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < SPARK_COUNT; i++) {
      const i3 = i * 3;
      const uv = trail.current[i];

      const depth = 0; // the Z position of the sparkles (adjust if you move them back/forth)
      const fov = (camera.fov * Math.PI) / 180;
      const heightAtDepth =
        2 * Math.tan(fov / 2) * Math.abs(camera.position.z - depth);
      const widthAtDepth = heightAtDepth * (size.width / size.height);

      const x = (uv.x - 0.5) * widthAtDepth;
      const y = (uv.y - 0.5) * heightAtDepth;

      const z = Math.sin(time * 4 + i * 0.2) * 0.3;

      positions[i3 + 0] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
    }

    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.08}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
