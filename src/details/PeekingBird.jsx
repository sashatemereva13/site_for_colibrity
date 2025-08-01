import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";

export default function PeekingBird({
  birdPos = [0, 0, 0], // initial [x, y, z]
  holeDepth = 0.2, // peek distance: in X if horizontal, Y if vertical
  scale = 0.3,
  seed = "",
  isHorizontal = false, // horizontal (X) vs vertical (Y) peek
}) {
  const groupRef = useRef();

  // load the GLTF hummingbird model
  const { scene } = useGLTF("/models/hummingbird.glb");
  useGLTF.preload("/models/hummingbird.glb");

  // PRNG based on seed for timing
  const rand = useMemo(() => {
    let x =
      typeof seed === "string" && seed.length
        ? seed.charCodeAt(0)
        : Math.random() * 255;
    return () => (Math.sin(x++) + 1) * 0.5;
  }, [seed]);

  useEffect(() => {
    const grp = groupRef.current;
    if (!grp) return;

    // Destructure initial positions
    const [bx, by, bz] = birdPos;

    // Set bird at its starting position
    grp.position.set(bx, by, bz);

    // Compute timing values
    const duration1 = THREE.MathUtils.lerp(0.5, 0.8, rand());
    const duration2 = THREE.MathUtils.lerp(0.8, 1.2, rand());
    const delay = THREE.MathUtils.lerp(0, 3, rand());

    // Build the timeline
    const tl = gsap.timeline({ repeat: -1, repeatDelay: delay });

    if (isHorizontal) {
      // Horizontal peek: move X by holeDepth
      const leftX = bx - holeDepth;
      const rightX = bx + holeDepth;
      tl.to(grp.position, {
        x: rightX,
        duration: duration1,
        ease: "power2.out",
      })
        .to(grp.position, { x: leftX, duration: duration2, ease: "sine.inOut" })
        .to(grp.position, { x: bx, duration: duration1, ease: "power2.in" });
    } else {
      // Vertical peek: move Y by holeDepth
      const upY = by + holeDepth;
      tl.to(grp.position, {
        y: upY,
        duration: duration1,
        ease: "power2.out",
      }).to(grp.position, { y: by, duration: duration2, ease: "sine.inOut" });
    }

    // Idle pause
    tl.to({}, { duration: rand() * 2 });

    return () => tl.kill();
  }, [birdPos, holeDepth, rand, isHorizontal]);
  const seedHash = useMemo(() => rand() * Math.PI * 2, [rand]);
  useFrame(({ clock }) => {
    const grp = groupRef.current;
    if (!grp) return;
    // subtle wing/head-flap tilt

    const FLAP_SPEED = 1.0; // lower → slower oscillation
    const FLAP_AMP = 0.05; // lower → less tilt
    grp.rotation.z =
      Math.sin(clock.getElapsedTime() * FLAP_SPEED + seedHash) * FLAP_AMP;
  });

  return (
    <group ref={groupRef} scale={scale} rotation={[0, Math.PI, 0]}>
      <primitive object={scene.clone()} />
      <spotLight
        position={[0.3, 1, 1.5]}
        angle={0.6}
        penumbra={0.4}
        intensity={1}
        distance={4}
        color="#fff9dd"
        castShadow
      />
    </group>
  );
}
