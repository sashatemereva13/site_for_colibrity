// src/scene1elements/Corridor.jsx
import * as THREE from "three";
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import CorridorWallLinesMaterial from "./CorridorWallMaterial";
import Portal from "./Portal";
import { useLanguage } from "../../allScenes/LanguageProvider";
import RoomWallMaterial from "../RoomWallMaterial";

export default function Corridor({ mainBirdRef }) {
  const groupRef = useRef();

  const { t } = useLanguage();
  const portalARef = useRef();

  return (
    <group ref={groupRef} position={[0, 5, 60]}>
      {/* Curved Corridor Shell (walls + ceiling) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[3, 3, 80, 64, 1, true, Math.PI, Math.PI * 2]}
        />
        <CorridorWallLinesMaterial
          height={7}
          radius={3}
          numLines={3}
          thickness={0.25}
        />
      </mesh>

      {/* <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[3, 3, 90, 64, 1, true, Math.PI, Math.PI * 2]}
        />
        <RoomWallMaterial
          bandCount={8}
          bandThickness={0.01}
          baseAlpha={1}
          glowAlpha={1}
          bg="#ef9fce"
          colLow="#D14D7E"
          colHigh="#FFFEFF"
        />
      </mesh> */}

      {/* Four portals down the corridor (tweak Zs if needed) */}
      <Portal
        position={[0, 0, 20]}
        birdRef={mainBirdRef}
        label={t("portalAgencyBase")}
      />
      <Portal
        position={[0, 0, -5]}
        birdRef={mainBirdRef}
        label={t("portalSince2018")}
      />
      <Portal
        position={[0, 0, -30]}
        birdRef={mainBirdRef}
        label={t("portalEntrance")}
      />
    </group>
  );
}
