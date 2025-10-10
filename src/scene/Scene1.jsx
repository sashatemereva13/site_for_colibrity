// Scene1.jsx
import { useThree, useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import { useState, useRef, useMemo } from "react";
import { useEffect } from "react";
import * as THREE from "three";
import WinBird from "../birds/WinBird";
import { OrbitControls } from "@react-three/drei";
import WinBirdFollowCamera from "../utils/WinBirdFollowCamera";

import { Cloud } from "@react-three/drei";
import TVGameSlotPositioner from "../utils/TVGameSlotPositioner";
import { ExportGLB } from "../utils/ExportGLB";

import FallingBirds from "../birds/FallingBirds";
import MainBird from "../birds/MainBird";
import Corridor from "../scene1elements/Corridor/Corridor";
import Room from "../scene1elements/Room/Room";
import DebugCurves from "../utils/DebugCurves";
import TVScreen from "../scene1elements/Room/TVScreen";
import TablesWithLaptops from "../scene1elements/Room/Tables/TablesWithLaptops";
import StaticCloud from "../scene1elements/Room/StaticCloud";
import StartButton from "../game2D/StartButton";
import CloudsCeiling from "../scene1elements/Room/CloudsCelling";

export default function Scene1({
  onGameTrigger,
  gameWon,
  onTVSlotsChange,
  showTVSlots,
  onWinBirdExit,
  persistentBirdRef,
  tvActiveId,
  setActiveTVId,
  tvScreenById,
  showGame,
  setShowGame,
  proceed = false,
  setProceed,
}) {
  const isMobile = window.innerWidth < 768;
  const groupForExportRef = useRef();
  // curve debugging
  const [showDebug, setShowDebug] = useState(true);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === "d") setShowDebug((v) => !v);
      if (!groupRef.current) return;

      if (e.key.toLowerCase() === "s" && groupForExportRef.current) {
        ExportGLB(groupForExportRef.current, "scene1_full.glb");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const camPosVisRef = useRef(new THREE.Vector3());
  const lookAtVisRef = useRef(new THREE.Vector3());

  const lastSlotsRef = useRef(false);

  const [laptopsOn, setLaptopsOn] = useState(false);
  const lastPowerRef = useRef(false);

  const [mainBirdLaptopsOn, setMainBirdLaptopsOn] = useState(false);
  const mainBirdlastPowerRef = useRef(false);

  const groupRef = useRef();
  const forcedTVIdRef = useRef(null);
  const handoffDoneRef = useRef(false);
  const winBirdPhaseRef = useRef(0);

  const [handoffY, setHandoffY] = useState(25);
  const cameraLockedRef = useRef(false);

  const hasInitialized = useRef(false);
  const gameTriggerRef = useRef(false);
  const winBirdRef = persistentBirdRef ?? useRef(null);

  const { camera } = useThree();
  const scroll = useScroll();
  const tvRef = useRef(null);
  const startButtonRef = useRef();

  // corridor bird
  const mainBirdRef = useRef(null);

  const tmpVec3 = useRef(new THREE.Vector3());

  const controlsRef = useRef();
  const wasSlotsOnRef = useRef(false);
  const prevTVIdRef = useRef(null);

  // Reuse vectors (no per-frame allocations)
  const birdPos = useMemo(() => new THREE.Vector3(), []);
  const targetCamPos = useMemo(() => new THREE.Vector3(), []);
  const targetCamLookAt = useMemo(() => new THREE.Vector3(), []);
  const currentCamPos = useMemo(() => new THREE.Vector3(), []);
  const currentCamLookAt = useMemo(() => new THREE.Vector3(), []);

  const onCurvePos = useMemo(() => new THREE.Vector3(), []);
  const onCurveLook = useMemo(() => new THREE.Vector3(), []);

  const tmpLook = useMemo(() => new THREE.Vector3(), []);

  const camPhase3End = useMemo(() => new THREE.Vector3(0, 2, 9), []);
  const offsetPhase1 = useMemo(() => new THREE.Vector3(0, 0.3, 1), []);
  const offsetPhase2 = useMemo(() => new THREE.Vector3(0, 0.3, 1), []);
  const lookAtCorridor = useMemo(() => new THREE.Vector3(0, 2, 10), []);
  const lookAtPhase2 = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const lookAtWide = useMemo(() => new THREE.Vector3(0, 2, -3), []);

  const camPosTV = useMemo(() => new THREE.Vector3(0, 3.1, 1), []);
  const camLookAtTV = useMemo(() => new THREE.Vector3(0, 3.2, 0), []);
  const tvStart = useMemo(() => new THREE.Vector3(0, 0.3, -6), []);
  const tvEnd = useMemo(() => new THREE.Vector3(0, 1, -10), []);

  const tmpTV = useMemo(() => new THREE.Vector3(), []);

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

  const pathCurve = useMemo(() => {
    // From far end toward the TV
    const zStart = 6.5; // near camPhase3End.z
    const zEnd = 1; // 1.0
    const steps = 120;

    // shape controls
    const AMP = 1.9; // left/right swing (~column spacing is 1.2)
    const WAVES = 3; // how many S turns between zStart→zEnd
    const Y0 = 2; // base height
    const Y1 = 2; // height toward the TV

    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps; // 0..1 along the path
      const z = THREE.MathUtils.lerp(zStart, zEnd, t);

      // nice ease in/out for vertical & amplitude
      const ez = t * t * (3 - 2 * t); // smoothstep
      const amp = AMP * (0.9 + 0.1 * Math.cos(Math.PI * t)); // subtle taper
      const x = Math.sin(Math.PI * WAVES * t) * amp;

      const y = THREE.MathUtils.lerp(Y0, Y1, ez);

      pts.push(new THREE.Vector3(-x, y, z));
    }

    pts[pts.length - 1].copy(camPosTV);

    const smooth = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
    // further sample & re-smooth for extra silk
    const sampled = smooth.getPoints(120);
    return new THREE.CatmullRomCurve3(sampled, false, "centripetal", 0.5);
  }, [camPosTV]);

  const lookAtCurve = useMemo(() => {
    const baseLookPoints = [
      new THREE.Vector3(-0.5, 0.5, 5.5),
      new THREE.Vector3(-0.7, 0.5, 5),
      new THREE.Vector3(0, 0.5, 4.6),
      new THREE.Vector3(1, 0.5, 3.8),
      new THREE.Vector3(0, 0.5, 3),
      new THREE.Vector3(-1, 1, 2.5),

      new THREE.Vector3(0, 1.5, 0),
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

  const followK = 3;
  const lookFollowK = 3;

  const tmpOffset = useMemo(() => new THREE.Vector3(0, 0, -10), []);
  const camAnchor = useRef(new THREE.Vector3());

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = scroll.offset * scroll.pages;
    const scene1DrivesCamera = t < 10;

    if (controlsRef.current?.enabled) return;

    if (mainBirdRef.current) {
      mainBirdRef.current.getWorldPosition(birdPos);
    }

    if (winBirdPhaseRef.current === 3 && !cameraLockedRef.current) {
      cameraLockedRef.current = true;
    }

    const slotsOn = t >= 9.9;
    if (slotsOn !== lastSlotsRef.current) {
      lastSlotsRef.current = slotsOn;
      onTVSlotsChange?.(slotsOn);
    }

    if (!slotsOn) {
      if (forcedTVIdRef.current !== "black") {
        prevTVIdRef.current = tvActiveId; // remember what was showing
        forcedTVIdRef.current = "black";
        setActiveTVId?.("black");
      }
    }

    // when we JUST turned ON (crossed 9.9): restore a poster once
    if (slotsOn && !wasSlotsOnRef.current) {
      forcedTVIdRef.current = null;
    }

    wasSlotsOnRef.current = slotsOn;

    if (scene1DrivesCamera) {
      if (t <= 4) {
        const beta = THREE.MathUtils.clamp((t - 2) / 2, 0, 1);
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

      if (t <= 6) {
        let u = THREE.MathUtils.clamp((t - 4) / 2, 0, 1);
        u = u * u * u;
        targetCamPos.copy(currentCamPos).lerp(camPhase3End, u);
        targetCamLookAt.copy(currentCamLookAt).lerp(lookAtWide, u);
      } else if (t < 10) {
        // progress along the path (0..1)
        const phaseT = THREE.MathUtils.clamp((t - 6) / 4, 0, 1);

        // sample path & look curves into temps
        pathCurve.getPointAt(phaseT, onCurvePos);
        lookAtCurve.getPointAt(phaseT, onCurveLook);

        // blend only at the *start* of the path so the handoff is smooth
        const a = 0.0,
          b = 0.08; // blend window; try 0.05–0.12
        const x = THREE.MathUtils.clamp((phaseT - a) / (b - a), 0, 1);
        const curveBlend = x * x * (3 - 2 * x); // smoothstep

        // position: glide from phase-3 end to the curve
        targetCamPos.copy(camPhase3End).lerp(onCurvePos, curveBlend);

        // lookAt: wide -> curve for X/Z (we override Y next)
        targetCamLookAt.copy(lookAtWide).lerp(onCurveLook, curveBlend);

        // keep Y flat at 0.5 during the whole path
        const baseY = 0.5;
        targetCamLookAt.y = baseY;

        // GRADUAL handoff of Y to the TV near the end of the path
        const tvBlendStart = 0.88; // start lifting to TV late on the path
        const tvBlendEnd = 1.0;
        const tvBx = THREE.MathUtils.clamp(
          (phaseT - tvBlendStart) / (tvBlendEnd - tvBlendStart),
          0,
          1
        );
        const tvBlend = tvBx * tvBx * (3 - 2 * tvBx); // smoothstep
        targetCamLookAt.y = THREE.MathUtils.lerp(baseY, camLookAtTV.y, tvBlend);
      }

      const mainBirdShouldBeOn = t > 2;
      if (mainBirdShouldBeOn !== mainBirdlastPowerRef.current) {
        mainBirdlastPowerRef.current = mainBirdShouldBeOn;
        setMainBirdLaptopsOn(mainBirdShouldBeOn);
      }

      const shouldBeOn = t > 6;
      if (shouldBeOn !== lastPowerRef.current) {
        lastPowerRef.current = shouldBeOn;
        setLaptopsOn(shouldBeOn);
      }

      // if (t > 6) {
      //   controlsRef.current.enabled = true;
      // }

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
    }

    // TV animation (same timing but fewer allocations)
    if (tvRef.current) {
      const tvPhase = t <= 9 ? 0 : THREE.MathUtils.clamp((t - 9) / 4, 0, 1);
      tmpTV.lerpVectors(tvStart, tvEnd, tvPhase);
      tvRef.current.position.lerp(tmpTV, 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      {/* <OrbitControls ref={controlsRef} enabled={false} /> */}
      <ambientLight intensity={1.2} /> {/* boosts overall brightness */}
      <directionalLight
        position={[5, 15, 25]}
        intensity={2.5} // strong sunlight
        color="white"
      />
      <Corridor mainBirdRef={mainBirdRef} />
      <mesh scale={500}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial side={THREE.BackSide} color={"#87CEEB"} />
      </mesh>
      <group ref={groupForExportRef}>
        <Room />

        <TVScreen
          isMobile={isMobile}
          tvRef={tvRef}
          screenById={tvScreenById}
          activeId={tvActiveId}
          fitMode="cover"
          align="left"
          zoom={0.57}
        />
      </group>
      <TVGameSlotPositioner
        key={`${showGame ? "game" : "no-game"}-${gameWon ? "won" : "not-won"}`}
        tvRoot={tvRef}
        materialName="Description"
        rootId="tvButtonSlot"
      />
      {showTVSlots && (
        <>
          <TVGameSlotPositioner
            tvRoot={tvRef}
            materialName="Game"
            rootId="tvGameSlot"
          />
        </>
      )}
      <MainBird
        mainBirdLaptopsOn={mainBirdLaptopsOn}
        scroll={scroll}
        ref={mainBirdRef}
      />
      <FallingBirds
        scroll={scroll}
        // keep your existing prop if any (e.g., scroll={scroll})
        firstRowModelUrl="/models/birdWithGlasses.glb"
        defaultModelUrl="/models/hummingbird.glb"
      />
      <TablesWithLaptops laptopsOn={laptopsOn} />
      {gameWon && (
        <>
          <WinBird
            centerTarget={[0, 0, -4]} // Y ignored; current Y is preserved
            phaseRef={winBirdPhaseRef}
            birdRef={winBirdRef}
            trigger={proceed}
            handoffY={handoffY}
            onHandoffReady={() => {
              if (!handoffDoneRef.current) {
                handoffDoneRef.current = true;
                const p = new THREE.Vector3();
                winBirdRef.current?.getWorldPosition(p);
                onWinBirdExit?.(p.toArray());
              }
            }}
          />

          <WinBirdFollowCamera
            birdRef={winBirdRef}
            phaseRef={winBirdPhaseRef}
            proceed={proceed}
            cameraLockedRef={cameraLockedRef}
            followDeltaY={15}
            blendDur={1.0}
            followK={3}
            lookK={3}
            onStartY={(startY) => setHandoffY(startY + 17)}
          />
        </>
      )}

    </group>
  );
}
