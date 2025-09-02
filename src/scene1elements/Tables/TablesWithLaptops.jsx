// TablesWithLaptops.jsx
import Candy from "./Candy"; // use the external component
import Laptop from "../Laptops/Laptop";
import * as THREE from "three";

const ROW_SRCS = [
  "/TV/TV_AR.mp4",
  "/TV/TV_Analytics.mp4",
  "/TV/TV_Code.mp4",
  "/TV/TV_Design.mp4",
  "/TV/TV_Design.mp4",
];

const TablesWithLaptops = ({ laptopsOn = false }) => {
  return (
    <>
      {[...Array(5)].map((_, row) =>
        [...Array(6)].map((_, col) => {
          const x = col * 1.2 - 3.0;
          const z = 1 + row * 1.2;
          const src = ROW_SRCS[row] ?? ROW_SRCS[0];

          return (
            <group key={`${row}-${col}`}>
              {/* table leg */}
              <mesh castShadow position={[x, 0.5, z]}>
                <cylinderGeometry args={[0.15, 0.2, 0.7]} />
                <meshPhysicalMaterial
                  color="rgba(244, 216, 241, 1)"
                  roughness={0.8}
                  metalness={0.1}
                />
              </mesh>

              {/* tabletop */}
              <mesh castShadow position={[x, 0.85, z]}>
                <cylinderGeometry args={[0.4, 0.4, 0.01]} />
                <meshStandardMaterial
                  color="#fae7f6"
                  roughness={0.8}
                  metalness={0.1}
                />
              </mesh>

              {/* laptop */}
              <Laptop position={[x, 0.85, z]} src={src} poweredOn={laptopsOn} />

              {/* row 0: animated candy above laptop */}
              {row === 0 && (
                <Candy
                  position={[x, 0.7, z]}
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
    </>
  );
};

export default TablesWithLaptops;
