import { useEffect, forwardRef, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";

const ShapeHole = forwardRef(
  ({ id, shape, position, holeColor, locked, highlighted }, outerRef) => {
    const localRef = useRef(); // Internal ref for hole behavior
    const materialRef = useRef();

    // Sync the outer ref (for GSAP) with the internal one
    useEffect(() => {
      if (!outerRef) return;

      const exposed = {
        group: localRef.current, // to move or scale the hole
        material: materialRef.current, // to animate opacity or color
      };

      if (typeof outerRef === "function") {
        outerRef(exposed);
      } else {
        outerRef.current = exposed;
      }
    }, [outerRef]);

    // Only set position/color when not locked
    useEffect(() => {
      // Just update color/emissive — no animation!
      if (materialRef.current) {
        materialRef.current.color.set(holeColor);
        materialRef.current.emissive.set(holeColor);
      }
    }, [holeColor]);

    // Animate pulse only when highlighted and not locked
    useFrame(({ clock }) => {
      if (!localRef.current || !materialRef.current) return;

      const t = clock.getElapsedTime();

      if (highlighted && !locked) {
        const pulse = 1 + Math.sin(t * 5) * 0.15;
        localRef.current.scale.set(pulse, pulse, 1);
        materialRef.current.emissiveIntensity = 0.8 + Math.sin(t * 6) * 0.5;
      } else if (locked) {
        localRef.current.scale.set(1, 1, 1);
        materialRef.current.emissiveIntensity = 0.6;
      } else {
        localRef.current.scale.set(1, 1, 1);
        materialRef.current.emissiveIntensity = 0.3;
      }
    });

    return (
      <group ref={localRef} name={`hole-${id}`} position={position}>
        <mesh>
          {shape === "cube" && <planeGeometry args={[0.5, 0.5]} />}
          {shape === "sphere" && <circleGeometry args={[0.3, 32]} />}
          {shape === "torus" && <ringGeometry args={[0.1, 0.3, 32]} />}
          {shape === "cone" && (
            <shapeGeometry
              args={[
                (() => {
                  const tri = new THREE.Shape();
                  tri.moveTo(0, 0.5);
                  tri.lineTo(-0.3, -0.3);
                  tri.lineTo(0.3, -0.3);
                  tri.lineTo(0, 0.5);
                  return tri;
                })(),
              ]}
            />
          )}
          <meshStandardMaterial
            ref={materialRef}
            color={holeColor}
            side={THREE.DoubleSide}
            transparent
            opacity={1}
          />
        </mesh>
      </group>
    );
  }
);

export default ShapeHole;
