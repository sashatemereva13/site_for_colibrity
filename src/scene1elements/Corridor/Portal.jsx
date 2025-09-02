// src/scene1elements/Portal.jsx
import { forwardRef, useRef, useImperativeHandle, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import PortalSurface from "./PortalShader"; // your filled-disk shader
import DottedText from "./DottedText";
import SurfaceBurstOnBird from "./SurfaceBurstOnBird";
import VertexPointsOnBird from "./VertexPointsOnBird";
import * as THREE from "three";

const Portal = forwardRef((props, ref) => {
  const {
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    label = "",
    labelSize = 0.35,
    labelColor = "#000000",
    fontUrl = "/fonts/Neue_Machina.ttf",
    birdRef,
  } = props;

  const groupRef = useRef(null);
  useImperativeHandle(ref, () => groupRef.current, []);

  // the surface particles
  const burstRef = useRef(null);

  // plane-crossing detector
  const prevSide = useRef(null);
  const tmp = new THREE.Vector3();

  useFrame(() => {
    const obj = groupRef.current;
    if (!obj || !birdRef?.current) return;

    const tick = () => {
      // portal plane: its local +Z axis; compare bird position in portal's local space
      birdRef.current.getWorldPosition(tmp);
      obj.worldToLocal(tmp); // now tmp is in portal local space
      const side = Math.sign(tmp.z); // + in front, - behind (assuming portal faces +Z)
      if (prevSide.current === null) prevSide.current = side;

      // crossed the plane?
      if (side !== 0 && prevSide.current !== 0 && side !== prevSide.current) {
        console.log("✨ Portal crossed → triggering SurfaceBurstOnBird");

        burstRef.current?.burst();
      }
      prevSide.current = side;
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [birdRef]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <PortalSurface position={[0, 0, 0]} />

      {/* Billboard label (dotted) */}
      {label && (
        <Billboard follow>
          <DottedText
            position={[0, 0, 0.2]}
            font={fontUrl}
            fontSize={labelSize}
            color={labelColor}
            anchorX="center"
            anchorY="middle"
            textAlign="center"
            maxWidth={4}
            lineHeight={1.2}
            dotScale={1.5}
            dotSize={1.7}
            fillBg={false}
          >
            {label}
          </DottedText>
        </Billboard>
      )}

      {/* Mount the surface-burst under the bird so it sticks as she flies */}
      {/* {birdRef && (
        <SurfaceBurstOnBird
          ref={burstRef}
          targetRef={birdRef}
          count={1600}
          squarePx={18}
          life={5.8}
          mono={true} // set false for colorful TV-static
          speed={3.0}
          saturation={0.3}
          contrast={0.6}
          brightness={1.0}
          normalPush={0.02}
          debug
          includeMaterialsByName={[/^Material[_\.]?0*07$/i]} // your matcap material name(s)
        />
      )} */}

      {/* {birdRef && (
        <VertexPointsOnBird
          ref={burstRef}
          targetRef={birdRef}
          size={0.1} // visual size of each “vertex dot”
          color="#ffffff"
          alpha={1.0}
          normalPush={0.02} // 0 = exactly on skin; tiny >0 to float
          includeMaterialsByName={[/^Material[_\.]?0*07$/i]} // body mat only; or remove to use all
          stride={1} // raise to thin out: 2, 3, 4…
          fraction={1.0} // or 0.5 for half of remaining vertices (random)
          debug
        />
      )} */}
    </group>
  );
});

export default Portal;
