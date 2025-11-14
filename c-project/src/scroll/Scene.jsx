import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { getOrbitPosition } from "../utils/OrbitPath";
import { useScroll } from "@react-three/drei";
import * as THREE from "three";

export default function Scene({
  logo,
  hummingbird,
  phraseRefs = [],
  setScrollValue,
  setPhraseAngles,
}) {
  const scroll = useScroll();
  const { camera, scene } = useThree();

  useFrame(() => {
    const t = scroll.offset; // represents how far the user has scrolled

    const radius = 21;
    const heightIncrease = 20;
    const center = { x: 0, y: 0, z: 0 };

    const baseAngle = t * Math.PI * 2 + Math.PI;

    // Logo orbiting
    if (logo?.current) {
      const lx = center.x + radius * Math.sin(baseAngle);
      const lz = center.z + radius * Math.cos(baseAngle);
      const ly = center.y + (baseAngle / (2 * Math.PI)) * heightIncrease - 10;

      logo.current.position.set(lx, ly, lz);

      logo.current.lookAt(camera.position);
    }

    // phrases orbiting
    const offsetBetween = Math.PI / 2;
    const angles = [];

    phraseRefs.forEach((ref, i) => {
      if (!ref.current) return;

      // Orbit logic
      const phraseAngle = baseAngle - offsetBetween * (i + 1);
      const { position } = getOrbitPosition({ angle: phraseAngle });

      ref.current.position.set(position.x, position.y, position.z);
      ref.current.lookAt(center.x, center.y, center.z);

      // Get world direction of phrase
      const phraseDir = new THREE.Vector3();
      ref.current.getWorldDirection(phraseDir);

      // Get camera direction
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);

      // Compute angle in degrees
      const angleRad = phraseDir.angleTo(cameraDir);
      const angleDeg = THREE.MathUtils.radToDeg(angleRad);

      // ✨ Store angle on the ref for Inspire to use
      angles[i] = angleDeg;
    });

    if (setPhraseAngles) {
      setPhraseAngles([...angles]); // trigger React update
    }

    // Bird and camera movement
    const flyStart = 0.75;
    const flyEnd = 1;

    const flyProgress = THREE.MathUtils.clamp(
      (t - flyStart) / (flyEnd - flyStart),
      0,
      1
    );

    const smoothstep = (edge0, edge1, x) => {
      const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
      return t * t * (3 - 2 * t);
    };

    const easedFly = smoothstep(0, 1, flyProgress);

    const flyX = THREE.MathUtils.lerp(0, -70, easedFly);
    const flyY = THREE.MathUtils.lerp(0, 100, easedFly);
    const flyZ = -10;

    if (hummingbird?.current) {
      const y = t < flyStart ? -2 + Math.sin(t * Math.PI * 2) * 0.3 : flyY;
      const x = t < flyStart ? -2 + Math.sin(t * Math.PI * 2) * 0.3 : flyX;
      hummingbird.current.position.set(x, y, flyZ);
      hummingbird.current.rotation.y = t * Math.PI * 2;
      // console.log(hummingbird.current.position);

      // console.log("🐦 Bird Y:", hummingbird.current.position.y.toFixed(2));
      // console.log("🌀 t:", t.toFixed(2));
      // console.log("📈 flyProgress:", flyProgress.toFixed(2));
      // console.log("📦 flyY:", flyY.toFixed(2));
      // console.log("🐦 ref is:", hummingbird.current);
    }

    // Background color
    const bgColor = new THREE.Color();
    bgColor.lerpColors(
      new THREE.Color("#000000"),
      new THREE.Color("#3B5C6A"),
      THREE.MathUtils.smoothstep(t, 0.8, 1)
    );

    scene.background = bgColor;

    // Create a target camera position
    if (t < flyStart) {
      const introProgress = THREE.MathUtils.smoothstep(0, flyStart, t);
      const introStart = new THREE.Vector3(0, 0, 20);
      const introEnd = new THREE.Vector3(0, -4, 5);
      const introTarget = new THREE.Vector3().lerpVectors(
        introStart,
        introEnd,
        introProgress
      );

      camera.position.lerp(introTarget, 0.02); // Smooth motion for intro
      // console.log("camera position is at", camera.position);
    } else {
      // Follow bird naturally after flyStart
      const targetY = flyY - 10;
      const targetZ = 40 - t * 10;
      const targetPos = new THREE.Vector3(0, targetY, targetZ);

      camera.position.lerp(targetPos, 0.02); // Smooth follow after intro
    }

    if (hummingbird?.current) {
      camera.lookAt(hummingbird.current.position);
    }

    if (setScrollValue) {
      setScrollValue(t);
    }
  });

  // useFrame(() => {
  //   console.log("Scroll offset:", scroll.offset.toFixed(2));
  // });

  return null;
}
