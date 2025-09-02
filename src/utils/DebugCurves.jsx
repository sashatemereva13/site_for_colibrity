// DebugCurves.jsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

export default function DebugCurves({
  pathCurve,
  lookAtCurve,
  camPosRef,
  lookAtRef,
}) {
  const pathPoints = useMemo(() => pathCurve.getPoints(200), [pathCurve]);
  const lookPoints = useMemo(() => lookAtCurve.getPoints(200), [lookAtCurve]);

  const camDot = useRef();
  const lookDot = useRef();
  const rayLine = useRef();

  // === helpers (top of file) ===
  const seatPos = (row, col, y = 1.55) =>
    new THREE.Vector3(col * 1.2 - 3.0, y, 1 + row * 1.2);
// z x y
  // find u on curve that's closest to a point
  const closestUOnCurve = (curve, point, samples = 500) => {
    const tmp = new THREE.Vector3();
    let bestU = 0,
      bestD = Infinity;
    for (let i = 0; i <= samples; i++) {
      const u = i / samples;
      curve.getPointAt(u, tmp);
      const d = tmp.distanceToSquared(point);
      if (d < bestD) {
        bestD = d;
        bestU = u;
      }
    }
    return bestU;
  };

  // === after your pathCurve is created ===
  const focusTarget = useMemo(() => seatPos(0.5, 2, 1), []);
  const focusU = useMemo(
    () => closestUOnCurve(pathCurve, focusTarget),
    [pathCurve, focusTarget]
  );

  // Pre-allocate ray geometry
  const rayGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(6), 3)
    );
    return g;
  }, []);

  useFrame(() => {
    if (!camPosRef.current || !lookAtRef.current) return;

    // Move dots
    camDot.current.position.copy(camPosRef.current);
    lookDot.current.position.copy(lookAtRef.current);

    // Update ray (camera → lookAt)
    const attr = rayGeom.getAttribute("position");
    attr.setXYZ(
      0,
      camPosRef.current.x,
      camPosRef.current.y,
      camPosRef.current.z
    );
    attr.setXYZ(
      1,
      lookAtRef.current.x,
      lookAtRef.current.y,
      lookAtRef.current.z
    );
    attr.needsUpdate = true;
  });

  return (
    <group>
      {/* Curves */}
      <Line points={pathPoints} color="orange" />
      <Line points={lookPoints} color="cyan" />

      {/* Dots */}
      <mesh ref={camDot}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <mesh ref={lookDot}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="blue" />
      </mesh>

      {/* Ray */}
      <line ref={rayLine} geometry={rayGeom}>
        <lineBasicMaterial />
      </line>

      <mesh position={focusTarget}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="deepskyblue" />
      </mesh>
    </group>
  );
}
