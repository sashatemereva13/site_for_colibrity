// Room.jsx — uses baked wall GLB instead of curved walls placeholder
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useState } from "react";
import { useGLTF } from "@react-three/drei";
import { ExportGLB } from "../utils/ExportGLB";
import { EffectComposer, GodRays } from "@react-three/postprocessing";

const WALL_GLTF_PATH = "/models/Wall_BakedTest.glb";

function WindowGobo({
  count = 5,
  gap = 0.6,
  width = 0.25,
  span = 6,
  z = 2,
  y = 8.8,
}) {
  const bars = Array.from({ length: count }, (_, i) => {
    const totalWidth = span;
    const full = count * width + (count - 1) * gap;
    const start = -full / 2 + width / 2;
    const x = start + i * (width + gap);
    return { x };
  });
  return (
    <group rotation={[-Math.PI / 3, 0, 0]} position={[0, y, z]}>
      {bars.map(({ x }, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[width, 0.25, 2]} />
          <meshStandardMaterial color="black" />
        </mesh>
      ))}
    </group>
  );
}

const Room = () => {
  const groupRef = useRef();
  const [sun, setSun] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (!groupRef.current) return;
      if (e.key.toLowerCase() === "f")
        ExportGLB(groupRef.current, "room_with_wall.glb");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const radius = 25;

  const { scene: wallScene } = useGLTF(WALL_GLTF_PATH);

  const wall = useMemo(() => {
    if (!wallScene) return null;
    const clone = wallScene.clone(true);
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const m = o.material;
        if (m?.map?.isTexture) {
          m.map.colorSpace = THREE.SRGBColorSpace;
          m.map.needsUpdate = true;
        }
        if (m) m.side = THREE.DoubleSide;
      }
    });
    return clone;
  }, [wallScene]);

  return (
    <group ref={groupRef}>
      {/* Walls */}
      {wall && (
        <primitive
          position={[0, -1, 0]}
          object={wall}
          castShadow
          receiveShadow
          userData={{ exportNote: "Baked wall from GLB" }}
        />
      )}

      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
      >
        <circleGeometry args={[radius, 96]} />
        <meshStandardMaterial
          color="#ef9fce"
          roughness={0.35}
          metalness={0.1}
        />
      </mesh>

      {/* === God Rays source (must be VISIBLE to the camera) === */}
      <mesh ref={setSun} position={[0, 10, 2]} frustumCulled={false}>
        <sphereGeometry args={[0.5, 32, 32]} />
        {/* Basic, very bright, not tone-mapped so it “blows out” */}
        <meshBasicMaterial color="white" toneMapped={false} />
      </mesh>

      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 10, 60]} />
      <WindowGobo count={20} gap={0.2} width={0.2} span={10} z={2} y={9.2} />

      {/* Postprocessing (don’t nest this if you already have a global composer) */}
      <EffectComposer>
        <GodRays
          sun={sun}
          density={0.85}
          decay={0.95}
          weight={1.0}
          exposure={0.9}
          samples={32}
          clampMax={1.0}
        />
      </EffectComposer>
    </group>
  );
};

export default Room;
