import { useRef, useState, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useDrag } from "@use-gesture/react";
import * as THREE from "three";
import gsap from "gsap";
import { useScroll } from "@react-three/drei";

export default function DraggableShape({
  id,
  shape,
  position,
  color,
  target,
  onCorrectDrop,
  onWrongDrop,
  onHighlightHole,
  disabled,
  movingHoles,
}) {
  const ref = useRef();
  const lineRef = useRef();
  const { gl } = useThree();

  const [placed, setPlaced] = useState(false);
  const [pullVector, setPullVector] = useState(new THREE.Vector3());
  const [isDragging, setIsDragging] = useState(false);
  const [visible, setVisible] = useState(false);

  const maxPull = 2;
  const shootSpeed = 3;
  const gravity = 0.0001;
  const SNAP_Z = 0.1;
  const LOCK_THRESHOLD = 0.01;

  const scroll = useScroll();
  const holeVec = useMemo(() => new THREE.Vector3(), []);
  const shapeVec = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    // Show shapes only near end of scroll
    if (!visible && scroll.offset >= 0.98) {
      setVisible(true);
      if (ref.current) {
        gsap.fromTo(
          ref.current.scale,
          { x: 0, y: 0, z: 0 },
          { x: 0.25, y: 0.25, z: 0.25, duration: 0.3, ease: "back.out(1.7)" }
        );
      }
    }

    if (!visible) return;
    tryLockShape();

    // Highlight hole when dragging the correct shape (no need for alignment)
    if (isDragging && !placed) {
      onHighlightHole?.(target.id);
    }

    if (!lineRef.current || !isDragging) return;

    const start = ref.current.position;
    const end = start.clone().add(pullVector.clone().multiplyScalar(-2));
    const posArray = lineRef.current.geometry.attributes.position.array;
    posArray.set([start.x, start.y, start.z, end.x, end.y, end.z]);
    lineRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const tryLockShape = () => {
    if (!ref.current || placed || disabled || movingHoles) return;

    holeVec.fromArray(target.position);
    shapeVec.copy(ref.current.position);

    const xAligned = Math.abs(holeVec.x - shapeVec.x) < LOCK_THRESHOLD;
    const yAligned = Math.abs(holeVec.y - shapeVec.y) < LOCK_THRESHOLD;

    if (id === target.id && shape === target.shape && xAligned && yAligned) {
      setPlaced(true);
      gsap.killTweensOf(ref.current.position);
      gsap.to(ref.current.position, {
        x: holeVec.x,
        y: holeVec.y,
        z: SNAP_Z,
        duration: 0.2,
        ease: "power2.out",
        onComplete: () => onCorrectDrop(id),
      });
    }
  };

  const bind = useDrag(
    ({ delta: [dx, dy], last }) => {
      if (placed || !visible) return;
      ref.current.position.x += dx * 0.01;
      ref.current.position.y -= dy * 0.01;

      const pull = ref.current.position
        .clone()
        .sub(new THREE.Vector3(...position));
      if (pull.length() > maxPull) pull.setLength(maxPull);
      setPullVector(pull);
      setIsDragging(!last);

      tryLockShape();

      if (last) {
        onHighlightHole?.(null); // stop highlighting when released
        shootShape(pull);
      }
    },
    { pointer: { capture: true }, eventOptions: { passive: false } }
  );

  const shootShape = (pull) => {
    gsap.killTweensOf(ref.current.position);

    const launchVector = pull.clone().multiplyScalar(-shootSpeed);
    const targetZ = target.position[2] ?? 0.05;
    const startY = ref.current.position.y;
    const dest = new THREE.Vector3(
      ref.current.position.x + launchVector.x,
      ref.current.position.y + launchVector.y,
      targetZ
    );

    setIsDragging(false);
    onHighlightHole?.(null);

    gsap.to(ref.current.position, {
      x: dest.x,
      y: dest.y,
      z: dest.z,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: function () {
        const p = gsap.getProperty(this, "progress");
        ref.current.position.y =
          startY + (dest.y - startY) * p - gravity * p * p * 200;
        tryLockShape();
      },
      onComplete: () => checkHit(dest),
    });
  };

  const checkHit = (pos) => {
    holeVec.fromArray(target.position);
    const dist = pos.distanceTo(holeVec);
    onHighlightHole?.(null);

    if (dist < 0.5 && id === target.id && !placed) {
      setPlaced(true);
      gsap.to(ref.current.position, {
        x: holeVec.x,
        y: holeVec.y,
        z: SNAP_Z,
        duration: 0.3,
        ease: "power2.out",
        onUpdate: tryLockShape,
      });
    } else {
      gsap.to(ref.current.position, {
        x: position[0],
        y: position[1],
        z: position[2],
        duration: 0.5,
        ease: "bounce.out",
        onComplete: onWrongDrop,
      });
    }
  };

  return visible ? (
    <>
      <mesh
        {...bind()}
        ref={ref}
        position={position}
        scale={[0.4, 0.4, 0.4]}
        castShadow
        onPointerOver={() => (gl.domElement.style.cursor = "grab")}
        onPointerOut={() => (gl.domElement.style.cursor = "auto")}
      >
        {shape === "cube" && <boxGeometry args={[1, 1, 1]} />}
        {shape === "sphere" && <sphereGeometry args={[0.6, 32, 32]} />}
        {shape === "cone" && <coneGeometry args={[0.5, 1, 32]} />}
        {shape === "torus" && <torusGeometry args={[0.4, 0.15, 16, 100]} />}
        <meshStandardMaterial
          emissive={color}
          emissiveIntensity={0.4}
          color={color}
        />
      </mesh>

      {isDragging && (
        <line ref={lineRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array(6)}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} transparent opacity={0.6} />
        </line>
      )}
    </>
  ) : null;
}
