import { useThree, useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import { useState, useRef, useMemo } from "react";
import * as THREE from "three";
import { Text } from "@react-three/drei";

import Laptop from "../details/Laptop";
import FallingBirds from "../details/FallingBirds";
import MainBird from "../details/MainBird";
import Corridor from "../details/Corridor";
import Room from "../details/Room";

export default function Scene1({ onGameTrigger }) {
  const hasInitialized = useRef(false);
  const gameTriggerRef = useRef(false);

  const { camera } = useThree();
  const scroll = useScroll();
  const tvRef = useRef(null);
  const birdRef = useRef(null);

  // Reuse vectors (no per-frame allocations)
  const birdPos = useMemo(() => new THREE.Vector3(), []);
  const targetCamPos = useMemo(() => new THREE.Vector3(), []);
  const targetCamLookAt = useMemo(() => new THREE.Vector3(), []);
  const currentCamPos = useMemo(() => new THREE.Vector3(), []);
  const currentCamLookAt = useMemo(() => new THREE.Vector3(), []);
  const tmpOffset = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);

  const camPhase3End = useMemo(() => new THREE.Vector3(0, 2, 9), []);
  const offsetPhase1 = useMemo(() => new THREE.Vector3(0, 0.3, 1), []);
  const offsetPhase2 = useMemo(() => new THREE.Vector3(0, 0.3, 1), []);
  const lookAtCorridor = useMemo(() => new THREE.Vector3(0, 2, 10), []);
  const lookAtPhase2 = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const lookAtWide = useMemo(() => new THREE.Vector3(0, 1, -3), []);

  const camPosTV = useMemo(() => new THREE.Vector3(0, 1.51, 1), []);
  const camLookAtTV = useMemo(() => new THREE.Vector3(0, 1.5, -1), []);
  const tvStart = useMemo(() => new THREE.Vector3(0, 1.5, -5), []);
  const tvEnd = useMemo(() => new THREE.Vector3(0, 1.3, -4), []);

  // Helper to smooth points (Chaikin) — cached, not per frame
  const smoothPoints = (points, iterations = 2) => {
    let pts = points.slice();
    for (let iter = 0; iter < iterations; iter++) {
      const newPts = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const Q = new THREE.Vector3().copy(p0).lerp(p1, 0.25);
        const R = new THREE.Vector3().copy(p0).lerp(p1, 0.75);
        newPts.push(Q, R);
      }
      pts = [pts[0], ...newPts, pts[pts.length - 1]];
    }
    return pts;
  };

  // Cache curves (sampled once)
  const pathCurve = useMemo(() => {
    const basePoints = [
      camPhase3End,
      new THREE.Vector3(0, 1.5, 7),
      new THREE.Vector3(0, 1.5, 6),
      new THREE.Vector3(-1.2, 1.5, 5),
      new THREE.Vector3(-1.5, 1.5, 4),
      new THREE.Vector3(0, 1.5, 4),
      new THREE.Vector3(1.5, 1.5, 4),
      new THREE.Vector3(0, 1.5, 3),
      camPosTV,
    ];
    const roughCurve = new THREE.CatmullRomCurve3(
      basePoints,
      false,
      "centripetal",
      0.5
    );
    const sampled = roughCurve.getPoints(100);
    const smoothed = smoothPoints(sampled, 3);
    return new THREE.CatmullRomCurve3(smoothed, false, "centripetal", 0.5);
  }, [camPhase3End, camPosTV]);

  const lookAtCurve = useMemo(() => {
    const baseLookPoints = [
      new THREE.Vector3(-0.5, 0, 4),
      new THREE.Vector3(-1, 0, 4),
      new THREE.Vector3(0, -0.1, 4),
      new THREE.Vector3(1, -0.1, 0),
      new THREE.Vector3(0, 0, 0),
      camLookAtTV.clone(),
    ];
    const roughCurve = new THREE.CatmullRomCurve3(
      baseLookPoints,
      false,
      "centripetal",
      0.5
    );
    const sampled = roughCurve.getPoints(60);
    const smoothed = smoothPoints(sampled, 2);
    return new THREE.CatmullRomCurve3(smoothed, false, "centripetal", 0.5);
  }, [camLookAtTV]);

  const followK = 6;
  const lookFollowK = 3;

  useFrame((_, delta) => {
    const t = scroll.offset;

    // No need to force worldMatrix updates unless parent transforms change
    if (birdRef.current) {
      birdRef.current.getWorldPosition(birdPos);
    }

    // Original camera phase logic (unchanged)
    if (t <= 0.4) {
      const beta = THREE.MathUtils.clamp((t - 0.2) / 0.2, 0, 1);
      tmpOffset.copy(offsetPhase1).lerp(offsetPhase2, beta);
      tmpLook
        .copy(lookAtCorridor)
        .lerp(tmpLook.copy(birdPos).add(lookAtPhase2), beta);
      targetCamPos.copy(birdPos).add(tmpOffset);
      targetCamLookAt.copy(tmpLook);
      currentCamPos.copy(targetCamPos);
      currentCamLookAt.copy(targetCamLookAt);
      camera.position.copy(currentCamPos);
      camera.lookAt(currentCamLookAt);
      return;
    }

    if (t <= 0.6) {
      let u = THREE.MathUtils.clamp((t - 0.4) / 0.2, 0, 1);
      u = u * u * u;
      targetCamPos.copy(currentCamPos).lerp(camPhase3End, u);
      targetCamLookAt.copy(currentCamLookAt).lerp(lookAtWide, u);
    } else {
      const phaseT = THREE.MathUtils.clamp((t - 0.6) / 0.4, 0, 1);
      pathCurve.getPointAt(phaseT, targetCamPos);

      if (t >= 0.97) {
        targetCamLookAt.copy(camLookAtTV);
      } else {
        lookAtCurve.getPointAt(phaseT, targetCamLookAt);
        targetCamLookAt.y = THREE.MathUtils.clamp(targetCamLookAt.y, -0.3, 0.3);
      }
    }

    if (!hasInitialized.current) {
      currentCamPos.copy(targetCamPos);
      currentCamLookAt.copy(targetCamLookAt);
      camera.position.copy(currentCamPos);
      camera.lookAt(currentCamLookAt);
      hasInitialized.current = true;
      return;
    }

    const lerpAmtPos = 1 - Math.exp(-followK * delta);
    const lerpAmtLook = 1 - Math.exp(-lookFollowK * delta);
    currentCamPos.lerp(targetCamPos, lerpAmtPos);
    currentCamLookAt.lerp(targetCamLookAt, lerpAmtLook);

    camera.position.copy(currentCamPos);
    camera.lookAt(currentCamLookAt);

    // TV animation (same timing but fewer allocations)
    if (tvRef.current) {
      const tvPhase =
        t <= 0.9 ? 0 : THREE.MathUtils.clamp((t - 0.9) / 0.4, 0, 1);
      tmpOffset.lerpVectors(tvStart, tvEnd, tvPhase);
      tvRef.current.position.lerp(tmpOffset, 0.1);
    }

    if (t >= 0.9999 && !gameTriggerRef.current) {
      gameTriggerRef.current = true;
      onGameTrigger?.();
    }
  });

  return (
    <>
      <ambientLight castShadow intensity={0.6} />

      <directionalLight
        position={[0, 10, 5]}
        intensity={0.9}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      <Corridor />
      <Room />

      <mesh ref={tvRef} position={[0, 5, -10]}>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      <MainBird scroll={scroll} ref={birdRef} />
      <FallingBirds scroll={scroll} />

      {[...Array(5)].map((_, row) =>
        [...Array(6)].map((_, col) => {
          const x = col * 1.2 - 3;
          const z = 1 + row * 1.2;
          return (
            <group key={`${row}-${col}`}>
              <mesh castShadow position={[x, 0.5, z]}>
                <boxGeometry args={[0.9, 0.3, 0.5]} />
                <meshStandardMaterial
                  color="#9ec0d6"
                  roughness={0.8}
                  metalness={0.1}
                />
              </mesh>
              <Laptop position={[x, 0.66, z]} />
            </group>
          );
        })
      )}
    </>
  );
}
