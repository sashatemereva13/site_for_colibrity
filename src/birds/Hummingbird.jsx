import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import * as THREE from "three";

const Hummingbird = ({ birdRef, setScrollValue }) => {
  const scroll = useScroll();

  // explicit start below the origin
  const startPos = useRef(new THREE.Vector3(0, 0, 10));
  const startRotY = useRef(0);

  // after intro finishes, we’ll offset from this base (the origin)
  const baseAfterIntro = useRef(new THREE.Vector3(0, 0, 5));

  const [introFlight, setIntroFlight] = useState(true);
  const introT = useRef(0);

  useEffect(() => {
    if (!birdRef?.current) return;

    // place the bird at the explicit start
    birdRef.current.position.copy(startPos.current);

    // remember its initial yaw
    startRotY.current = birdRef.current.rotation.y;

    // start small
    birdRef.current.scale.set(0.1, 0.1, 0.1);
  }, [birdRef]);

  useFrame((_, delta) => {
    if (!birdRef?.current) return;

    if (introFlight) {
      // fly to (0,0,0) and grow in ~3s
      introT.current += delta / 3;
      const t = Math.min(introT.current, 1);

      // position: start -> origin
      birdRef.current.position.lerpVectors(
        startPos.current,
        baseAfterIntro.current, // (0,0,0)
        t
      );

      // scale up smoothly
      const s = THREE.MathUtils.lerp(0.1, 5.0, t); // adjust target size here
      birdRef.current.scale.set(s, s, s);

      const prim = birdRef.current.children?.[0];
      if (prim) prim.scale.setScalar(0.2 * s * 2);

      if (t >= 1) {
        setIntroFlight(false); // intro done; hand control to scroll
      }
      return;
    }

    // --- scroll-based motion (offset from the origin after intro) ---
    const t = scroll.offset;
    const up = THREE.MathUtils.lerp(0, 60, t);
    const right = THREE.MathUtils.lerp(0, 8, t);
    const dz = THREE.MathUtils.lerp(0, -15, t);

    birdRef.current.position.set(
      baseAfterIntro.current.x + right,
      baseAfterIntro.current.y + up,
      baseAfterIntro.current.z + dz
    );

    birdRef.current.rotation.y = startRotY.current + t * Math.PI;

    setScrollValue?.(t);
  });

  return null;
};

export default Hummingbird;
