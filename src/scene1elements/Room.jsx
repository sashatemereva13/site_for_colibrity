// Room.jsx — walls + floor + FOUR perimeter GodRaysReversed placed by world angles
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { ExportGLB } from "../utils/ExportGLB";
import KletkaFloor from "./KletkaFloor";
import GodRaysReversed from "./GodRaysReversed";
import FloorGLB from "./Floor";
import NeonRing from "./NeonRing";
import PortalRainParticles from "./Corridor/PortalRainParticles";

const WALL_GLTF_PATH = "/models/Wall_BakedTest.glb";
const GODRAYS_GLTF_PATH = "/models/godRays.glb"; // optional extra

// ---- floor config (mirror your shader so angles stay aligned) ----
const FLOOR_CONFIG = {
  radius: 25, // outer floor radius (placement circle)
  numRays: 14, // number of highlight lines in KletkaFloor
  ringRadius: 8, // used by the shader; not used for placement here
  ringWidth: 0.1, // used by the shader; not used for placement here
  baseRotationDeg: 38.5, // matches uBaseRot in your shader
  perimeterInset: 0.22, // small inward nudge from the wall to avoid clipping
  yPlace: 0.02, // sit just above the floor
};

// === Pick the exact *world* angles (degrees) for your circled spots ===
// Adjust these 4 numbers until they line up perfectly with your circled places.
// The code will snap each angle to the nearest highlight line so it stays aligned.
const SELECTED_RAY_INDICES = [2, 3, 4, 5, 6, 7];

export default function Room() {
  const groupRef = useRef();

  useEffect(() => {
    const onKey = (e) => {
      if (!groupRef.current) return;
      if (e.key.toLowerCase() === "f") {
        ExportGLB(groupRef.current, "room_with_wall.glb");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --- Load baked wall
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

  // --- Optional baked god rays decoration
  const { scene: godRaysScene } = useGLTF(GODRAYS_GLTF_PATH);
  const godRays = useMemo(() => {
    if (!godRaysScene) return null;
    const clone = godRaysScene.clone(true);
    clone.traverse((o) => {
      if (o.isMesh) {
        o.material.transparent = true;
        o.material.depthWrite = false;
        o.material.side = THREE.DoubleSide;
        if (o.material.emissive) o.material.emissiveIntensity = 1.0;
      }
    });
    return clone;
  }, [godRaysScene]);

  // ---- Compute 4 placements at OUTER perimeter from world angles ----
  const { numRays, baseRotationDeg, radius, perimeterInset, yPlace } =
    FLOOR_CONFIG;

  const baseRot = (baseRotationDeg * Math.PI) / 180; // shader's uBaseRot
  const sector = (Math.PI * 2) / Math.max(numRays, 1); // angle per highlight slice
  const rPlace = Math.max(0, radius - perimeterInset);

  // Final placements
  const rayPlacements = useMemo(() => {
    return SELECTED_RAY_INDICES.map((i, k) => {
      // Compute world yaw from index to keep alignment with floor lines
      const centerAng = -Math.PI + (i + 0.5) * sector;
      const thetaWorld = centerAng - baseRot;

      const x = Math.cos(thetaWorld) * rPlace;
      const z = Math.sin(thetaWorld) * rPlace;

      return {
        key: `ray-${i}-${k}`,
        i,
        position: [x, yPlace, z],
        rotation: [0, -thetaWorld, 0], // face outward from center
        thetaWorld,
      };
    });
  }, [SELECTED_RAY_INDICES, sector, baseRot, rPlace, yPlace]);

  return (
    <group ref={groupRef}>
      {/* Walls */}
      {wall && (
        <primitive
          position={[0, -0.5, 0]}
          object={wall}
          castShadow
          receiveShadow
          userData={{ exportNote: "Baked wall from GLB" }}
        />
      )}

      {/* Floor */}
      {/* <KletkaFloor
        radius={FLOOR_CONFIG.radius}
        numRays={FLOOR_CONFIG.numRays}
        ringRadius={FLOOR_CONFIG.ringRadius}
        ringWidth={FLOOR_CONFIG.ringWidth}
        baseRotationDeg={FLOOR_CONFIG.baseRotationDeg}
      /> */}

      <FloorGLB position={[0, 0, 0]} />

      <NeonRing
        radius={24.2} // <- change this live
        thickness={0.35}
        glow={1.3}
        softness={9.55}
        color="#feeff7"
        y={0.015}
        animatePulse={false}
      />

      {/* <group name="PerimeterGodRays_Selected">
        {rayPlacements.map(({ key, position, rotation }) => (
          <GodRaysReversed key={key} position={position} rotation={rotation} />
        ))}
      </group> */}

      <GodRaysReversed position={[0, 15, 5]} rotation={[Math.PI, 0, 0]} />

      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 10, 60]} />
    </group>
  );
}
