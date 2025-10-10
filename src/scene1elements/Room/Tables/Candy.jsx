// Candy.jsx
import * as THREE from "three";
import React, { useEffect, useMemo, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

export default function Candy({
  url = "/models/candy.glb",
  actionName, // e.g. "Idle" (optional; falls back to first clip)
  loop = THREE.LoopRepeat,
  timeScale = 1,
  startAt = 0,
  ...props // position, rotation, scale
}) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  // clone so each instance gets its own skeleton & mixer
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    const name =
      (actionName && names.includes(actionName) && actionName) || names[0];
    const act = name ? actions[name] : null;
    if (!act) return;

    act.reset().setLoop(loop, Infinity).play();
    act.timeScale = timeScale;
    act.time = startAt;

    return () => act.stop();
  }, [actions, names, actionName, loop, timeScale, startAt]);

  // (optional) shadow/material tweaks
  useEffect(() => {
    cloned.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material && "side" in o.material)
          o.material.side = THREE.FrontSide;
      }
    });
  }, [cloned]);

  return (
    <group ref={group} {...props}>
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload("/models/candy.glb");
