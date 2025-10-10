// src/scene1elements/Portal.jsx
import { forwardRef, useRef, useImperativeHandle } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

const smoothstep = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const Portal = forwardRef((props, ref) => {
  const {
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    label = "",
    labelSize = 0.15,
    labelColor = "#ffffff",
    fontUrl = "/fonts/NeueMachina-Black.ttf",
    shadowColor = "#000000",
    shadowOpacity = 0.4,

    // ▶ NEW: proximity controls
    birdRef, // ref to the main bird (forwarded from Corridor)
    appearAt = 10, // fully visible when closer than this (meters)
    fadeWidth = 2, // softness of fade (meters)
    dampK = 6, // fade speed (higher = snappier)
  } = props;

  const groupRef = useRef();
  useImperativeHandle(ref, () => groupRef.current, []);

  // collect text refs for quick opacity updates (no React state per frame)
  const shadowRefs = useRef([]);
  const mainTextRef = useRef();

  // working vars (reused to avoid GC)
  const tmpBird = useRef(new THREE.Vector3());
  const tmpPortal = useRef(new THREE.Vector3());
  const alphaRef = useRef(0); // current opacity (0..1)

  useFrame((_, delta) => {
    if (!birdRef?.current || !groupRef.current) return;

    birdRef.current.getWorldPosition(tmpBird.current);
    groupRef.current.getWorldPosition(tmpPortal.current);

    const dist = tmpBird.current.distanceTo(tmpPortal.current);

    // Target alpha rises as we approach: 0 past (appearAt + fadeWidth), 1 before (appearAt - fadeWidth)
    const a0 = appearAt + fadeWidth;
    const a1 = appearAt - fadeWidth;
    const targetAlpha = smoothstep(a0, a1, dist);

    // critically damped lerp toward target
    const k = 1 - Math.exp(-dampK * Math.min(delta, 0.05));
    alphaRef.current += (targetAlpha - alphaRef.current) * k;

    const alpha = alphaRef.current;

    // apply to all texts (Troika Text supports fillOpacity + outlineOpacity)
    for (const t of shadowRefs.current) {
      if (!t) continue;
      t.fillOpacity = alpha * shadowOpacity;
      t.outlineOpacity = 0; // shadows use fill only
    }
    if (mainTextRef.current) {
      mainTextRef.current.fillOpacity = alpha;
      mainTextRef.current.outlineOpacity = alpha; // keep halo in sync
    }

    // optional: toggle visibility for perf when invisible
    groupRef.current.visible = alpha > 0.005;
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <Text
        ref={mainTextRef}
        position={[0, 0, 0.2]}
        font={fontUrl}
        fontSize={labelSize}
        color={labelColor}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={4}
        lineHeight={1.2}
      >
        {label}
      </Text>
    </group>
  );
});

export default Portal;
