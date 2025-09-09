import * as THREE from "three";
import { useMemo, useRef, useEffect, Fragment } from "react";

/**
 * Places upward-facing spotlights around the ring, aligned with the star-ray lines.
 * - Uses the same angular logic as KletkaFloor (center of each sector).
 * - Corrects for uBaseRot so lights match the baked pattern on the shader.
 */
export default function KletkaRimLights({
  // Geometry / alignment (mirror KletkaFloor props)
  numRays = 8,
  ringRadius = 5,
  baseRotationDeg = 30,

  // Placement
  y = 0.02, // light base height (just above floor)
  height = 4, // how high the beam points (target y = y + height)

  // Light look
  color = "#ffdff3",
  intensity = 2.2,
  distance = 18,
  angleDeg = 20, // cone angle in degrees
  penumbra = 0.7,
  decay = 2,

  // Shadows
  castShadow = true,
  shadowMapSize = 512, // keep modest; many lights can be heavy
}) {
  const sector = useMemo(() => (Math.PI * 2) / Math.max(1, numRays), [numRays]);
  const baseRotRad = useMemo(
    () => (baseRotationDeg * Math.PI) / 180,
    [baseRotationDeg]
  );

  // World-space angles for the ray centers, corrected for shader's baked rotation:
  // Shader uses: p = rot2(world, uBaseRot), so world angle = rotatedAngle - uBaseRot
  const angles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < numRays; i++) {
      const centerAng = -Math.PI + (i + 0.5) * sector; // shader ray center in rotated space
      const worldAng = centerAng - baseRotRad; // convert to world space
      arr.push(worldAng);
    }
    return arr;
  }, [numRays, sector, baseRotRad]);

  return (
    <>
      {angles.map((ang, i) => {
        const x = Math.cos(ang) * ringRadius;
        const z = Math.sin(ang) * ringRadius;
        return (
          <UpSpot
            key={i}
            position={[x, y, z]}
            targetPosition={[x, y + height, z]}
            color={color}
            intensity={intensity}
            distance={distance}
            angleDeg={angleDeg}
            penumbra={penumbra}
            decay={decay}
            castShadow={castShadow}
            shadowMapSize={shadowMapSize}
          />
        );
      })}
    </>
  );
}

/**
 * A single upward-facing spotlight with its own target object.
 * Ensures the cone points straight up at the same (x, z).
 */
function UpSpot({
  position = [0, 0, 0],
  targetPosition = [0, 4, 0],
  color = "#ffffff",
  intensity = 2,
  distance = 15,
  angleDeg = 20,
  penumbra = 0.6,
  decay = 2,
  castShadow = true,
  shadowMapSize = 512,
}) {
  const lightRef = useRef();
  const target = useMemo(() => new THREE.Object3D(), []);

  // Keep target synced with props
  useEffect(() => {
    target.position.set(...targetPosition);
    if (lightRef.current) {
      lightRef.current.target = target;
      if (castShadow) {
        const s = lightRef.current.shadow;
        s.mapSize.width = shadowMapSize;
        s.mapSize.height = shadowMapSize;
        // A gentle bias reduces acne on the floor
        s.bias = -0.0002;
      }
    }
  }, [target, targetPosition, castShadow, shadowMapSize]);

  return (
    <Fragment>
      <spotLight
        ref={lightRef}
        position={position}
        color={color}
        intensity={intensity}
        distance={distance}
        angle={(angleDeg * Math.PI) / 180}
        penumbra={penumbra}
        decay={decay}
        castShadow={castShadow}
      />
      {/* The target must be in the scene graph */}
      <primitive object={target} />
    </Fragment>
  );
}
