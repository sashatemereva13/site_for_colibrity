import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "./BackGardenShader";

export default function BackGarden({ scrollValue }) {
  const meshRef = useRef();
  const { camera, size } = useThree();

  const mouse = useRef(new THREE.Vector2(0.5, 0.5));
  const lastMove = useRef(Date.now());
  const opacity = useRef(0);

  const uniforms = useRef({
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uOpacity: { value: 0 },
    uTime: { value: 0 },
    uScroll: { value: 0 },
  });

  // Handle mouse
  useEffect(() => {
    const handleMouse = (e) => {
      lastMove.current = Date.now();
      mouse.current.x = e.clientX / window.innerWidth;
      mouse.current.y = 1.0 - e.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  // Set full-screen geometry based on camera frustum at depth -50
  useEffect(() => {
    if (meshRef.current) {
      const depth = 50; // same as mesh position.z (abs value)
      const fov = (camera.fov * Math.PI) / 180;
      const height = 2 * Math.tan(fov / 2) * depth;
      const width = height * (size.width / size.height);

      meshRef.current.geometry.dispose();
      meshRef.current.geometry = new THREE.PlaneGeometry(width, height);
    }
  }, [camera.fov, size.width, size.height]);

  useFrame(({ clock }) => {
    const now = Date.now();
    const timeSinceMove = now - lastMove.current;

    if (timeSinceMove < 200) {
      opacity.current = Math.min(opacity.current + 0.05, 0.3);
    } else {
      opacity.current = Math.max(opacity.current - 0.01, 0);
    }

    uniforms.current.uTime.value = clock.getElapsedTime();
    uniforms.current.uOpacity.value = opacity.current;
    uniforms.current.uMouse.value.lerp(mouse.current, 0.1);
    uniforms.current.uScroll.value = scrollValue;
  });

  return (
    <mesh ref={meshRef} scale={4} position={[0, 0, -100]}>
      <bufferGeometry />
      <shaderMaterial
        transparent
        depthWrite={false}
        depthTest={false}
        uniforms={uniforms.current}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
