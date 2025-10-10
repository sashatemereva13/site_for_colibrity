// WinBird.jsx
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Phases:
 * 0: Fly to center (XZ; keep start Y) — face travel direction.
 * 1: Rotate-in-place to face the viewer.
 * 2: Climb +phase2Climb, then rotate-in-place to Phase-3 heading (with gentle drift).
 * 3: Camera stops following; bird moves +phase3Up and phase3Z (default -10 in Z).
 */
export default function WinBird({
  phaseRef,
  birdRef,
  trigger,
  handoffY,
  onHandoffReady,

  // Phase 0 (to center)
  centerFirst = true,
  centerTarget = [0, 0, 0],
  centerDur = 1.0,

  // Phase 1 (turn from the viewer)
  turnDur = 0.2,
  viewerDir = [0, 0, -1],
  modelYawOffset = 0,
  facingAdjust = 0,

  // Phase 2 (climb + align to phase 3 heading)
  phase2Climb = 15,
  phase2Dur = 2.0,
  alignTurnDur = 0.7,

  // NEW: keep slight movement while aligning so it never looks frozen
  alignDriftFrac = 0.08, // fraction of the next leg to drift during 2b
  alignDriftK = 2.5, // drift smoothing strength

  // Phase 3 (exit move)
  phase3Up = 2,
  phase3Z = -5,
  phase3Dur = 1.0,
}) {
  const handedOff = useRef(false);
  const phase = useRef(0);
  const lastLoggedPhase = useRef(-1);

  // anchors / poses
  const startPose = useRef({ pos: new THREE.Vector3(), rotY: 0 });
  const pCenter = useRef(new THREE.Vector3());
  const pCenterReached = useRef(new THREE.Vector3());
  const p2Start = useRef(new THREE.Vector3());
  const p2End = useRef(new THREE.Vector3());
  const p3Start = useRef(new THREE.Vector3());
  const p3End = useRef(new THREE.Vector3());

  // yaw anchors
  const p1StartYaw = useRef(0);
  const p2AlignStartYaw = useRef(0);
  const p3TargetYaw = useRef(0);

  // timers
  const tPhase = useRef(0); // per-phase timer
  const tAlign = useRef(0); // phase-2 alignment timer

  // flags
  const p2AlignActive = useRef(false);

  // temps
  const tmp = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());
  const driftTarget = useRef(new THREE.Vector3());

  // easing
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const smooth = (x) => x * x * (3 - 2 * x); // smoothstep
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

  function lerpAngle(a, b, t) {
    const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a));
    return a + diff * THREE.MathUtils.clamp(t, 0, 1);
  }
  function yawFromDir(dx, dz) {
    return Math.atan2(dx, dz) + modelYawOffset + facingAdjust;
  }

  useEffect(() => {
    if (!trigger || !birdRef?.current) return;
    handedOff.current = false;

    const b = birdRef.current;

    // snapshot start
    b.getWorldPosition(startPose.current.pos);
    startPose.current.rotY = b.rotation.y;

    // center target (keep start Y)
    const [cx, _cy, cz] = centerTarget;
    pCenter.current.set(cx, startPose.current.pos.y, cz);

    // init
    phase.current = centerFirst ? 0 : 1;
    tPhase.current = 0;

    // reset sub-state
    p2AlignActive.current = false;
    tAlign.current = 0;

    pCenterReached.current.copy(b.position);
    p2Start.current.set(0, 0, 0);
    p2End.current.set(0, 0, 0);
    p3Start.current.set(0, 0, 0);
    p3End.current.set(0, 0, 0);
  }, [
    trigger,
    birdRef,
    centerFirst,
    centerTarget,
    modelYawOffset,
    facingAdjust,
  ]);

  useFrame((_, rawDelta) => {
    if (!trigger || !birdRef?.current || phase.current === 4) return;
    const b = birdRef.current;
    const dt = Math.min(rawDelta, 0.05);

    if (phaseRef) phaseRef.current = phase.current;

    if (lastLoggedPhase.current !== phase.current) {
      console.log(`[WinBird] phase → ${phase.current}`);
      lastLoggedPhase.current = phase.current;
    }

    // ---- PHASE 0: glide to center ----
    if (phase.current === 0) {
      const t = clamp01(tPhase.current / Math.max(centerDur, 0.001));
      const k = easeOutCubic(t);

      tmp.current.copy(startPose.current.pos).lerp(pCenter.current, k);
      b.position.copy(tmp.current);

      // face travel direction
      dir.current.copy(pCenter.current).sub(b.position);
      dir.current.y = 0;
      if (dir.current.lengthSq() > 1e-6) {
        const yaw = yawFromDir(dir.current.x, dir.current.z);
        const turn = 1 - Math.exp(-2.2 * dt);
        b.rotation.y = lerpAngle(b.rotation.y, yaw, turn);
      }

      if (t >= 1) {
        pCenterReached.current.copy(b.position);
        p1StartYaw.current = b.rotation.y;
        phase.current = 1;
        tPhase.current = 0;
        return;
      }

      tPhase.current += dt;
      return;
    }

    // ---- PHASE 1: rotate to viewer ----
    if (phase.current === 1) {
      const t = clamp01(tPhase.current / Math.max(turnDur, 0.001));
      const k = smooth(t);

      b.position.copy(pCenterReached.current);

      const [vx, , vz] = viewerDir;
      const targetYaw = yawFromDir(vx, vz);
      b.rotation.y = lerpAngle(p1StartYaw.current, targetYaw, k);

      if (t >= 1) {
        p2Start.current.copy(b.position);
        p2End.current.set(
          p2Start.current.x,
          p2Start.current.y + phase2Climb,
          p2Start.current.z
        );
        p2AlignActive.current = false;
        tAlign.current = 0;

        phase.current = 2;
        tPhase.current = 0;
        return;
      }

      tPhase.current += dt;
      return;
    }

    // ---- PHASE 2: climb, then rotate-in-place to phase-3 heading ----
    if (phase.current === 2) {
      // 2a) climb — use time-consistent smoothing to avoid stall near the top
      if (!p2AlignActive.current) {
        const t = clamp01(tPhase.current / Math.max(phase2Dur, 0.001));
        const k = smooth(t);

        tmp.current.lerpVectors(p2Start.current, p2End.current, k);

        // time-based smoothing (strong -> responsive) without double easing
        const alpha = 1 - Math.exp(-12 * dt);
        b.position.lerp(tmp.current, alpha);

        if (t >= 1) {
          // set up phase-3 movement + target yaw
          p3Start.current.copy(b.position);
          p3End.current.set(
            p3Start.current.x,
            p3Start.current.y + phase3Up,
            p3Start.current.z + phase3Z
          );
          const dx = p3End.current.x - p3Start.current.x;
          const dz = p3End.current.z - p3Start.current.z;
          p3TargetYaw.current = yawFromDir(dx, dz);

          // start 2b) rotate-in-place with gentle drift toward next leg
          p2AlignStartYaw.current = b.rotation.y;
          p2AlignActive.current = true;
          tAlign.current = 0;

          // pre-compute a tiny drift target (a small fraction into the next leg)
          driftTarget.current
            .copy(p3Start.current)
            .lerp(p3End.current, THREE.MathUtils.clamp(alignDriftFrac, 0, 0.5));
          return;
        }

        tPhase.current += dt;
        return;
      }

      // 2b) rotate-in-place + gentle drift so it never looks frozen
      {
        const t = clamp01(tAlign.current / Math.max(alignTurnDur, 0.001));
        const k = smooth(t);

        // keep position alive: nudge slightly toward the next leg
        const driftAlpha = 1 - Math.exp(-alignDriftK * dt);
        b.position.lerp(driftTarget.current, driftAlpha);

        // rotate toward phase-3 heading
        b.rotation.y = lerpAngle(
          p2AlignStartYaw.current,
          p3TargetYaw.current,
          k
        );

        if (t >= 1) {
          // snap start for the exit move to current position (already drifting)
          p3Start.current.copy(b.position);
          phase.current = 3;
          tPhase.current = 0;
          return;
        }

        tAlign.current += dt;
        return;
      }
    }

    // ---- PHASE 3: exit move ----
    if (phase.current === 3) {
      const t = clamp01(tPhase.current / Math.max(phase3Dur, 0.001));
      const k = smooth(t);

      tmp.current.lerpVectors(p3Start.current, p3End.current, k);
      const alpha = 1 - Math.exp(-6 * dt);
      b.position.lerp(tmp.current, alpha);

      // keep intended yaw
      const curYaw = b.rotation.y;
      b.rotation.y = lerpAngle(
        curYaw,
        p3TargetYaw.current,
        1 - Math.exp(-6 * dt)
      );

      if (t >= 1) {
        if (!handedOff.current) {
          handedOff.current = true;
          onHandoffReady?.();
        }
        phase.current = 4;
        return;
      }

      tPhase.current += dt;
      return;
    }
  });

  return null;
}
