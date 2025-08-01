import { useGLTF } from "@react-three/drei";
import { forwardRef, useEffect } from "react";
import * as THREE from "three";

const Bird = forwardRef((props, ref) => {
  const { scene } = useGLTF("/models/hummingbird.glb");
  useGLTF.preload("/models/hummingbird.glb");

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = false; // optional, but good to be explicit
        child.frustumCulled = false; // optional: prevents disappearing on camera edge
      }
    });
  }, [scene]);

  return (
    <group ref={ref} position={props.position} {...props}>
      <primitive object={scene} scale={0.2} rotation={[0, Math.PI, 0]} />
    </group>
  );
});

export default Bird;
