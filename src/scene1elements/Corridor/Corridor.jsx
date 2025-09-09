// src/scene1elements/Corridor.jsx
import * as THREE from "three";
import { useRef } from "react";
import { useThree } from "@react-three/fiber";
import WallMaterial from "./CorridorWallMaterial";
import Portal from "./Portal";
import { useLanguage } from "../../allScenes/LanguageProvider";
import { EffectComposer, GodRays } from "@react-three/postprocessing";

export default function Corridor({ mainBirdRef }) {
  const groupRef = useRef();
  const sunRef = useRef();
  const { t } = useLanguage();
  const { gl, scene, camera } = useThree();

  return (
    <group ref={groupRef} position={[0, 5, 60]}>
      {/* Corridor walls */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[3, 3, 80, 64, 1, true, Math.PI, Math.PI * 2]}
        />
        <WallMaterial
          zStart={120}
          zEnd={0}
          numLines={21}
          thickness={1.95}
          base="#730F2E"
          lineCol1="#f0b3d7"
          lineCol2="#5a3945"
        />
      </mesh>

      {/* Portals */}
      <Portal
        position={[0, 0, 30]}
        birdRef={mainBirdRef}
        label={t("portalAgencyBase")}
      />
      <Portal
        position={[0, 0, 15]}
        birdRef={mainBirdRef}
        label={t("portalSince2018")}
      />
      <Portal
        position={[0, 0, -5]}
        birdRef={mainBirdRef}
        label={t("portalEntrance")}
      />

      {/* Sun at the end of corridor */}
      <mesh ref={sunRef} position={[0, 0, -40]}>
        <sphereGeometry args={[3, 64, 64]} />
        <meshBasicMaterial color={"#fff7d6"} />
      </mesh>

      <EffectComposer>
        {sunRef.current && (
          <GodRays
            sun={sunRef.current}
            samples={60} // quality
            density={1.5}
            decay={0.65}
            weight={1.6}
            exposure={0.9}
            clampMax={1}
          />
        )}
      </EffectComposer>
    </group>
  );
}
