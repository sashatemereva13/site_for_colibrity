// details/FallingBirds.jsx
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { useRef, useMemo, useEffect } from "react";

function AnimatedBird({
  baseScene,
  animations,
  pos,
  scroll,
  enableAnimation = true,
}) {
  // Deep clone to preserve skeleton/skin
  const clone = useMemo(() => SkeletonUtils.clone(baseScene), [baseScene]);
  const group = useRef();
  const { actions, names } = useAnimations(animations, clone);

  // Start first animation track (if present)
  useEffect(() => {
    if (!enableAnimation) return;
    const a = actions?.[names?.[0]];
    a?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
  }, [actions, names, enableAnimation]);

  // mesh flags once
  useEffect(() => {
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
        child.frustumCulled = false;
      }
    });
  }, [clone]);

  useFrame(() => {
    // falling logic (kept from your version)
    const t = scroll.offset * scroll.pages;
    const localT = THREE.MathUtils.clamp((t - 1) / 5, 0, 1);
    const y = THREE.MathUtils.lerp(5, 1, localT);

    if (group.current) {
      group.current.position.set(pos.x, y, pos.z);
      group.current.rotation.set(0, Math.PI, 0);
      group.current.scale.set(0.2, 0.2, 0.2);
    }
  });

  return (
    <group ref={group}>
      <primitive object={clone} />
    </group>
  );
}

export default function FallingBirds({ scroll }) {
  // Default model (all rows except the first)
  const { scene: defaultScene, animations: defaultAnims } = useGLTF(
    "/models/hummingbird.glb"
  );
  // First-row model (with glasses)
  const { scene: firstRowScene, animations: firstRowAnims } = useGLTF(
    "/models/birdWithGlasses.glb"
  );

  // Preload both to avoid pop-in
  useGLTF.preload("/models/hummingbird.glb");
  useGLTF.preload("/models/bardWithGlasses.glb");

  // Positions (same 5x6 grid; includes row/col for picking the model)
  const birds = useMemo(() => {
    const out = [];
    const rows = 5,
      cols = 6;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * 1.2 - 3.0;
        const z = 1.5 + row * 1.2; // keep your original offset
        out.push({ x, z, row, col, key: `${row}-${col}` });
      }
    }
    return out;
  }, []);

  return (
    <>
      {birds.map((pos) => {
        const isFirstRow = pos.row === 0;
        const baseScene = isFirstRow ? firstRowScene : defaultScene;
        const animations = isFirstRow ? firstRowAnims : defaultAnims;

        // If the glasses model has no anims, enableAnimation can be false;
        // leaving true is fine if it has at least one track.
        const enableAnimation = true;

        return (
          <AnimatedBird
            key={pos.key}
            baseScene={baseScene}
            animations={animations}
            pos={pos}
            scroll={scroll}
            enableAnimation={enableAnimation}
          />
        );
      })}
    </>
  );
}
