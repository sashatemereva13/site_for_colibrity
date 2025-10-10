// TablesWithLaptops.jsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import Candy from "./Candy"; // use the external component
import Laptop from "../../Laptops/Laptop";
import * as THREE from "three";
import Tables from "./Tables";

const ROW_SRCS = [
  "/TV/TV_AR.mp4",
  "/TV/TV_Analytics.mp4",
  "/TV/TV_Code.mp4",
  "/TV/TV_Design.mp4",
  "/TV/TV_Design.mp4",
];

const TablesWithLaptops = ({ laptopsOn = false }) => {
  const groupRef = useRef();

  // Animate the whole group up and down
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <Tables />
      {[...Array(5)].map((_, row) =>
        [...Array(6)].map((_, col) => {
          const x = col * 1.2 - 3.0;
          const z = 1 + row * 1.2;
          const src = ROW_SRCS[row] ?? ROW_SRCS[0];

          return (
            <group key={`${row}-${col}`}>
              <Laptop position={[x, 0.85, z]} src={src} poweredOn={laptopsOn} />

              {/* row 0: animated candy above laptop */}
              {row === 0 && (
                <Candy
                  position={[x, 0.5, z]}
                  rotation={[0, Math.PI * 0.25, 0]}
                  scale={0.25}
                  actionName="Idle" // change to match Blender action name
                  loop={THREE.LoopRepeat}
                  startAt={(col * 0.3) % 2} // optional per-instance offset
                />
              )}
            </group>
          );
        })
      )}
    </group>
  );
};

export default TablesWithLaptops;
