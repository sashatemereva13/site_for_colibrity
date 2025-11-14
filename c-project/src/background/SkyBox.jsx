import { useScroll } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLoader } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Skybox() {
  const skyBox = useRef();
  const scroll = useScroll();

  const textures = useLoader(THREE.TextureLoader, [
    "/skyBox/px.png", // right
    "/skyBox/nx.png", // left
    "/skyBox/py.png", // top
    "/skyBox/ny.png", // bottom
    "/skyBox/pz.png", // front
    "/skyBox/nz.png", // back
  ]);

  const { scene } = useThree();
  scene.background = null;

  useFrame(() => {
    if (!skyBox.current || scroll.offset === undefined) return;
    const t = scroll.offset; // ← real-time scroll offset (0 to 1)

    console.log("Scroll offset:", scroll.offset);
    if (skyBox.current) {
      skyBox.current.rotation.y = t * Math.PI * 2;
    }
  });

  return (
    <group ref={skyBox}>
      <mesh>
        <boxGeometry args={[500, 500, 500]} />
        {textures.map((map, i) => (
          <meshBasicMaterial
            key={i}
            attach={`material-${i}`}
            map={map}
            side={THREE.BackSide}
            transparent={true}
            opacity={0.3}
            // depthWrite={false}
          />
        ))}
      </mesh>
    </group>
  );
}
