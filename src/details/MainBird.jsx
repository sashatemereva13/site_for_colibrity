import { useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useRef } from "react";
import * as THREE from "three";

import Bird from "./Bird";
import Laptop from "./Laptop";

const MainBird = forwardRef(({ scroll }, ref) => {
  const birdRef = useRef();
  const lightRef = useRef();
  const targetRef = useRef(); // explicit target for spotlight

  useImperativeHandle(ref, () => birdRef.current);

  useFrame(() => {
    const t = scroll.offset;
    let position = new THREE.Vector3();

    if (t <= 0.2) {
      const phaseT = t / 0.2;
      const start = new THREE.Vector3(0, 2.5, 80);
      const end = new THREE.Vector3(0, 2, 14);

      position.lerpVectors(start, end, phaseT);
      position.y += Math.sin(phaseT * Math.PI * 2) * 0.2;

      if (birdRef.current) birdRef.current.rotation.x = -0.5;
    } else if (t <= 0.4) {
      const phaseT = (t - 0.2) / 0.2;
      const start = new THREE.Vector3(0, 2, 14);
      const end = new THREE.Vector3(0.6, 0.6, 8);

      position.lerpVectors(start, end, phaseT);
      position.y += Math.sin(phaseT * Math.PI) * 1.5;
    } else {
      position.set(0.6, 0.6, 8);
      if (birdRef.current) {
        birdRef.current.rotation.x = THREE.MathUtils.lerp(
          birdRef.current.rotation.x,
          0,
          0.05
        );
      }
    }

    if (birdRef.current) {
      birdRef.current.position.copy(position);

      // Position light behind and above the bird
      if (lightRef.current && targetRef.current) {
        lightRef.current.position
          .copy(position)
          .add(new THREE.Vector3(0, 2, -0.5));
        targetRef.current.position.copy(position); // aim directly at the bird
      }
    }
  });

  return (
    <>
      <Laptop position={[0.6, 0.66, 7.6]} />
      <Bird ref={birdRef} />

      <object3D ref={targetRef} />

      {/* Desk */}
      <mesh position={[0.6, 0.5, 7.6]}>
        <boxGeometry args={[0.9, 0.3, 0.5]} />
        <meshStandardMaterial color="#35616b" />
      </mesh>
    </>
  );
});

export default MainBird;
