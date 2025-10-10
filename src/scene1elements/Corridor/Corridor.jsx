// src/scene1elements/Corridor.jsx
import * as THREE from "three";
import { useRef, useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import WallMaterial from "./CorridorWallMaterial";
import Portal from "./Portal";
import { useLanguage } from "../../allScenes/LanguageProvider";
import { EffectComposer, GodRays } from "@react-three/postprocessing";

export default function Corridor({ mainBirdRef }) {
  const groupRef = useRef();
  const meshRef = useRef(); // corridor wall mesh
  const sunRef = useRef();

  const { t } = useLanguage();
  const { gl, scene, camera } = useThree();

  // Fallbacks until computed
  const [zStart, setZStart] = useState(120);
  const [zEnd, setZEnd] = useState(0);

  // Compute world-space Z range once after mount

  return (
    <group ref={groupRef} position={[0, 5, 60]}>
      {/* Corridor walls */}
      <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry
          args={[3, 3, 80, 64, 1, true, Math.PI, Math.PI * 2]}
        />
        <WallMaterial
          zStart={zStart}
          zEnd={zEnd}
          numLines={21}
          thickness={1.95}
          base="#670826"
          lineCol1="#772f49"
          lineCol2="#f5cce3"
          endThicknessFactor={1.5} // try 1.5–2.5
        />
      </mesh>

      {/* Portals */}
      <Portal
        position={[0, 0.2, 20]}
        birdRef={mainBirdRef}
        label={t("portalAgencyBase")}
      />
      <Portal
        position={[0, 0.1, 10]}
        birdRef={mainBirdRef}
        label={t("portalSince2018")}
      />
      <Portal
        position={[0, 0, 0]}
        birdRef={mainBirdRef}
        label={t("portalEntrance")}
      />

      {/* Sun at the end of corridor */}
      <mesh ref={sunRef} position={[0, 0, -41]}>
        <sphereGeometry args={[3, 64, 64]} />
        <meshBasicMaterial color={"#fff7d6"} />
      </mesh>

      <EffectComposer>
        {sunRef.current && (
          <GodRays
            sun={sunRef.current}
            samples={60}
            density={1.5}
            decay={0.65}
            weight={1.0}
            exposure={0.9}
            clampMax={1}
          />
        )}
      </EffectComposer>
    </group>
  );
}
