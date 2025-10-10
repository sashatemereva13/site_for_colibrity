import { useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { useEffect } from "react";
import Bird from "./Bird";
import Laptop from "../scene1elements/Laptops/Laptop";
import TableSingular from "../scene1elements/Room/Tables/TableSingular";

const MainBird = forwardRef(({ scroll, mainBirdLaptopsOn = false }, ref) => {
  const mainBirdRef = useRef();
  const lightRef = useRef();
  const targetRef = useRef(); // explicit target for spotlight

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  useImperativeHandle(ref, () => mainBirdRef.current);

  useFrame(() => {
    const t = scroll.offset * scroll.pages;
    let position = new THREE.Vector3();

    const TURN_WINDOW = 0.5; // adjust feel
    const rProg = THREE.MathUtils.clamp(t / TURN_WINDOW, 0, 1);
    const targetYaw = THREE.MathUtils.lerp(0, Math.PI, easeOutCubic(rProg));

    if (t <= 2) {
      const phaseT = t / 2;
      const start = new THREE.Vector3(0, 5, 100);
      const end = new THREE.Vector3(0, 5, 14);

      position.lerpVectors(start, end, phaseT);
      position.y += Math.sin(phaseT * Math.PI * 2) * 0.2;

      if (mainBirdRef.current) mainBirdRef.current.rotation.x = -0.5;
    } else if (t <= 4) {
      const phaseT = (t - 2) / 2;
      const start = new THREE.Vector3(0, 5, 14);
      const end = new THREE.Vector3(0.6, 1, 8.2);

      position.lerpVectors(start, end, phaseT);
      position.y += Math.sin(phaseT * Math.PI) * 1.5;
    } else {
      position.set(0.6, 1, 8.2);
      if (mainBirdRef.current) {
        mainBirdRef.current.rotation.x = THREE.MathUtils.lerp(
          mainBirdRef.current.rotation.x,
          0,
          0.05
        );
      }
    }

    if (mainBirdRef.current) {
      mainBirdRef.current.position.copy(position);
    }

    if (mainBirdRef.current) {
      mainBirdRef.current.position.copy(position);
      mainBirdRef.current.rotation.y = THREE.MathUtils.lerp(
        mainBirdRef.current.rotation.y ?? Math.PI,
        targetYaw,
        0.15
      );
    }
  });

  return (
    <>
      <Laptop
        poweredOn={mainBirdLaptopsOn}
        position={[0.6, 0.85, 7.4]}
        src="/TV/TV_Design.mp4"
      />

      <Bird ref={mainBirdRef} />

      <TableSingular position={[-1.2, 0, 1.6]} />
    </>
  );
});

export default MainBird;
