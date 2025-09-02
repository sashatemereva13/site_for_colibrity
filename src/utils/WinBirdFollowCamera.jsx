import { useThree } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";

export default function WinBirdFollowCamera({
  birdRef,
  phaseRef,
  proceed,
  cameraLockedRef,
  followDeltaY = 15,
  blendDur = 1.0,
  followK = 3,
  lookK = 3,
  onStartY = null,
}) {
  const { camera } = useThree();

  const activeRef = useRef(false);
  const startYRef = useRef(null);
  const stopYRef = useRef(null);
  const camAnchor = useRef(new THREE.Vector3());

  const blendingRef = useRef(false);
  const blendElapsed = useRef(0);
  const blendStartY = useRef(0);
  const blendStartLook = useRef(new THREE.Vector3());

  const lockBlendingRef = useRef(false);
  const lockBlendElapsed = useRef(0);
  const lockBlendDur = useRef(0.45);
  const lockLookTarget = useRef(new THREE.Vector3());

  const birdPos = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!proceed || !birdRef?.current) return;

    birdRef.current.getWorldPosition(birdPos);
    startYRef.current = birdPos.y;
    stopYRef.current = birdPos.y + followDeltaY;

    if (typeof onStartY === "function") onStartY(startYRef.current);

    camAnchor.current.set(
      camera.position.x,
      camera.position.y,
      camera.position.z
    );

    blendStartY.current = camera.position.y;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    blendStartLook.current.copy(camera.position).add(dir.multiplyScalar(10));

    blendElapsed.current = 0;
    blendingRef.current = true;

    activeRef.current = true;
  }, [proceed]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);

    if (cameraLockedRef?.current) {
      if (lockBlendingRef.current) {
        lockBlendElapsed.current = Math.min(
          lockBlendElapsed.current + delta,
          lockBlendDur.current
        );
        const t =
          lockBlendDur.current > 0
            ? lockBlendElapsed.current / lockBlendDur.current
            : 1;
        const k = t * t * (3 - 2 * t);

        tmpLook.copy(blendStartLook.current).lerp(lockLookTarget.current, k);
        camera.lookAt(tmpLook);

        if (t >= 1) lockBlendingRef.current = false;
      }
      return;
    }

    if (!activeRef.current || !birdRef?.current) return;

    const phase = phaseRef?.current ?? 0;
    if (phase === 0 || phase === 1 || phase === 4) return;

    birdRef.current.getWorldPosition(birdPos);

    if (blendingRef.current) {
      blendElapsed.current += delta;
      const t = Math.min(blendElapsed.current / blendDur, 1);
      const k = t * t * (3 - 2 * t);

      const targetY = birdPos.y + 0.5;
      const y = THREE.MathUtils.lerp(blendStartY.current, targetY, k);
      camera.position.set(camAnchor.current.x, y, camAnchor.current.z);

      tmpLook.copy(blendStartLook.current).lerp(birdPos, k);
      camera.lookAt(tmpLook);

      if (t >= 1) blendingRef.current = false;
      return;
    }

    if (stopYRef.current != null && birdPos.y >= stopYRef.current) {
      activeRef.current = false;
      cameraLockedRef.current = true;

      lockBlendingRef.current = true;
      lockBlendElapsed.current = 0;
      lockLookTarget.current.copy(birdPos);

      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      blendStartLook.current.copy(camera.position).add(dir.multiplyScalar(10));
      return;
    }

    const targetY = birdPos.y + 0.5;
    const posAlpha = 1 - Math.exp(-followK * delta);
    const lookAlpha = 1 - Math.exp(-lookK * delta);

    const y = THREE.MathUtils.lerp(camera.position.y, targetY, posAlpha);
    camera.position.set(camAnchor.current.x, y, camAnchor.current.z);

    tmpLook.copy(blendStartLook.current);

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    tmpLook.copy(camera.position).add(dir.multiplyScalar(10));
    tmpLook.lerp(birdPos, lookAlpha);
    camera.lookAt(tmpLook);
  });
  return null;
}
