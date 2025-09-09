// src/components/ColibriParticles.jsx
import * as THREE from "three";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

export default forwardRef(function ColibriParticles(
  {
    url = "/models/colibriParticles333.glb",
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    /** name of the clip to play (leave empty to play the first one) */
    clip = null,
    /** fade in/out (s) when starting/stopping */
    fade,
    /** playback speed multiplier */
    speed = 1,
    /** start immediately */
    autoPlay = true,
    /** set true if you want this to always render (particles often need this) */
    disableFrustumCulling = true,
    onReady = () => {},
    ...rest
  },
  ref
) {
  // Load once
  const gltf = useGLTF(url);
  const root = useMemo(() => {
    // Clone to keep the original GLTF pristine (important with armatures)
    const clone = SkeletonUtils.clone(gltf.scene);
    // Friendly defaults for VFX-y scenes
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        if (o.material) {
          o.material.side = THREE.DoubleSide;
          o.material.depthWrite = true;
          // if exporting additive/glow mats, comment/uncomment as needed:
          // o.material.blending = THREE.AdditiveBlending;
          // o.material.transparent = true;
        }
      }
      if (disableFrustumCulling) o.frustumCulled = false;
    });
    return clone;
  }, [gltf.scene, disableFrustumCulling]);

  const group = useRef();
  const { actions, names, mixer, clips } = useAnimations(
    gltf.animations,
    group
  );

  // Choose an action
  const pickActionName = useMemo(() => {
    if (clip && actions[clip]) return clip;
    return names[0]; // first clip if none specified
  }, [clip, names, actions]);

  // Start playback
  useEffect(() => {
    if (!pickActionName) return;
    const action = actions[pickActionName];
    if (!action) return;
    mixer.timeScale = speed;
    if (autoPlay) {
      action.reset();
      if (fade > 0) action.fadeIn(fade);
      action.play();
    }
    onReady({ mixer, action, names, actions, clips });
    return () => {
      if (fade > 0) action.fadeOut(fade);
    };
  }, [pickActionName, actions, mixer, speed, autoPlay, fade, onReady, names, clips]);

  // Allow parent to re-trigger
  useImperativeHandle(ref, () => ({
    /** Restart current (or named) clip from time 0, useful for bursts */
    burst: (name = pickActionName) => {
      const act = actions[name];
      if (!act) return false;
      act.reset().play();
      return true;
    },
    /** Play a specific clip by name */
    play: (name) => {
      const act = actions[name];
      if (!act) return false;
      act.reset().fadeIn(fade).play();
      return true;
    },
    /** Stop current clip */
    stop: (name = pickActionName) => {
      const act = actions[name];
      if (!act) return false;
      act.fadeOut(fade);
      return true;
    },
    /** Access to names if you want to list them */
    clips: names,
    mixer,
  }));

  return (
    <group
      ref={group}
      position={position}
      rotation={rotation}
      scale={scale}
      {...rest}
    >
      <primitive object={root} />
    </group>
  );
});

useGLTF.preload("/models/colibriParticles333.glb");
