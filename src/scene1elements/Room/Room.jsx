// Room.jsx — walls + floor + perimeter (optional) GodRaysReversed and volumetric sun rays
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { ExportGLB } from "../../utils/ExportGLB";

import FloorGLB from "./Floor";
import NeonRing from "../NeonRing";
import WallsAnimation from "./Walls/WallsAnimation";
import WallsObject from "./Walls/WallsObject";
import CloudsCeiling from "./CloudsCelling";

const WALL_GLTF_PATH = "/models/Wall_BakedTest.glb";
const GODRAYS_GLTF_PATH = "/models/godRays.glb"; // optional extra

const FLOOR_CONFIG = {
  radius: 25,
  numRays: 14,
  ringRadius: 8,
  ringWidth: 0.1,
  baseRotationDeg: 38.5,
  perimeterInset: 0.22,
  yPlace: 0.02,
};

const SELECTED_RAY_INDICES = [2, 3, 4, 5, 6, 7];

export default function Room() {
  const groupRef = useRef();
  const sunRef = useRef();
  const [mounted, setMounted] = useState(false); // ensures a re-render after refs attach

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // --- Optional baked god rays decoration (from GLB)
  const { scene: godRaysScene } = useGLTF(GODRAYS_GLTF_PATH);
  const godRaysGLB = useMemo(() => {
    if (!godRaysScene) return null;
    const clone = godRaysScene.clone(true);
    clone.traverse((o) => {
      if (o.isMesh && o.material) {
        o.material.transparent = true;
        o.material.depthWrite = false;
        o.material.side = THREE.DoubleSide;
        if ("emissive" in o.material) o.material.emissiveIntensity = 1.0;
      }
    });
    return clone;
  }, [godRaysScene]);

  // ---- Compute placements at OUTER perimeter from world angles ----
  const { numRays, baseRotationDeg, radius, perimeterInset, yPlace } =
    FLOOR_CONFIG;

  const baseRot = (baseRotationDeg * Math.PI) / 180;
  const sector = (Math.PI * 2) / Math.max(numRays, 1);
  const rPlace = Math.max(0, radius - perimeterInset);

  const rayPlacements = useMemo(() => {
    return SELECTED_RAY_INDICES.map((i, k) => {
      const centerAng = -Math.PI + (i + 0.5) * sector;
      const thetaWorld = centerAng - baseRot;

      const x = Math.cos(thetaWorld) * rPlace;
      const z = Math.sin(thetaWorld) * rPlace;

      return {
        key: `ray-${i}-${k}`,
        i,
        position: [x, yPlace, z],
        rotation: [0, -thetaWorld, 0],
        thetaWorld,
      };
    });
  }, [sector, baseRot, rPlace, yPlace]);

  return (
    <group ref={groupRef}>
      <WallsObject doubleSided={false} position={[0, -0.5, 0]} />
      <FloorGLB position={[0, -0.01, 0]} />

      <WallsAnimation opacity={1} playbackRate={1.7} />
      <CloudsCeiling y={16} radius={10} count={10} scale={1} />
      <NeonRing
        radius={24.2}
        thickness={0.35}
        glow={1.3}
        softness={9.55}
        color="#feeff7"
        y={0.015}
        animatePulse={false}
      />

      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 10, 60]} />
    </group>
  );
}
