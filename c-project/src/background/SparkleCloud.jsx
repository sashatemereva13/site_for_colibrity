// components/SparkleCloud.jsx
import { useRef, useMemo, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SparkleMaterial } from "./SparkleMaterial"; // updated shader coming next

const NUM_PARTICLES = 300;
const BASE_SIZE = 0.08;

export default function SparkleCloud({ scrollValue = 0 }) {
  const pointsRef = useRef();
  const { size } = useThree();
  const mouse = useRef(new THREE.Vector2());
  const materialRef = useRef(SparkleMaterial.clone());

  const positions = useMemo(() => {
    const arr = new Float32Array(NUM_PARTICLES * 3);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < NUM_PARTICLES; i++) {
      const i3 = i * 3;
      const radius = 10;
      const y = 1 - (i / (NUM_PARTICLES - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;

      arr[i3] = radius * r * Math.cos(theta);
      arr[i3 + 1] = radius * y;
      arr[i3 + 2] = radius * r * Math.sin(theta);
    }
    return arr;
  }, []);

  const sizes = useMemo(() => {
    const arr = new Float32Array(NUM_PARTICLES);
    arr.fill(BASE_SIZE);
    return arr;
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, sizes]);

  useEffect(() => {
    const handleMouse = (e) => {
      mouse.current.x = (e.clientX / size.width) * 2 - 1;
      mouse.current.y = -(e.clientY / size.height) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [size]);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uScroll.value = scrollValue;
    materialRef.current.uniforms.uMouse.value.copy(mouse.current);
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={materialRef.current}
      position={[0, 0, 0]} // Optional: shift to where you want
    />
  );
}
