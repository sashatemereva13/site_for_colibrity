import * as THREE from "three";
import { useMemo, forwardRef } from "react";

const KletkaFloor = forwardRef(function KletkaFloor(
  {
    radius = 10,
    numRays = 8, // star rays
    lineWidth = 0.06, // ray thickness (world units)
    glowStrength = 3.2, // neon bleed
    ringRadius = 5.0, // clear inner circle radius
    ringWidth = 0.08, // ring thickness (drawn outside the circle)
    baseRotationDeg = 30, // <<< baked pattern rotation (degrees)
    rotation = [-Math.PI / 2, 0, 0],
    position = [0, 0.001, 0],
  },
  ref
) {
  const uniforms = useMemo(
    () => ({
      uBg: { value: new THREE.Color("#fbafbf") },
      uCol1: { value: new THREE.Color("#ffddf1") },
      uCol2: { value: new THREE.Color("#ffddf1") },
      uGlow: { value: new THREE.Color("#ffb6e2") },
      uNum: { value: numRays },
      uLine: { value: lineWidth },
      uGlowStr: { value: glowStrength },
      uRingR: { value: ringRadius },
      uRingW: { value: ringWidth },
      uBaseRot: { value: (baseRotationDeg * Math.PI) / 180 }, // radians
    }),
    [numRays, lineWidth, glowStrength, ringRadius, ringWidth, baseRotationDeg]
  );

  const vertexShader = /* glsl */ `
    varying vec3 vWorldPos;
    void main(){
      vec4 wp = modelMatrix * vec4(position,1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    varying vec3 vWorldPos;

    uniform vec3  uBg, uCol1, uCol2, uGlow;
    uniform float uNum, uLine, uGlowStr;
    uniform float uRingR, uRingW;
    uniform float uBaseRot; // baked rotation (radians)

    float angleDiff(float a, float b){
      float d = a - b;
      return abs(atan(sin(d), cos(d)));
    }

    vec2 rot2(vec2 p, float a){
      float c = cos(a), s = sin(a);
      return vec2(c*p.x - s*p.y, s*p.x + c*p.y);
    }

    void main(){
      // world-space XZ, then bake rotation
      vec2 p = rot2(vWorldPos.xz, uBaseRot);

      float r   = length(p);
      float ang = atan(p.y, p.x);

      float TWO_PI = 6.28318530718;
      float PI     = 3.14159265359;
      float eps    = 1e-4;

      // ---- Rays (only outside the circle) ----
      float sector    = TWO_PI / max(uNum, 1.0);
      float idx       = floor((ang + PI) / sector);
      float centerAng = -PI + (idx + 0.5) * sector;

      float dAng    = angleDiff(ang, centerAng);
      float distRay = r * sin(dAng);
      float aaRay   = fwidth(distRay);
      float rayMask = 1.0 - smoothstep(uLine - aaRay, uLine + aaRay, abs(distRay));

      // clip inside
      float outside = step(uRingR + eps, r);
      rayMask *= outside;

      // ---- Ring (entirely outside the circle) ----
      float ringCenter = uRingR + max(uRingW, 0.0) * 0.5;
      float distRing   = abs(r - ringCenter);
      float aaRing     = fwidth(distRing);
      float ringMask   = (1.0 - smoothstep(uRingW - aaRing, uRingW + aaRing, distRing)) * outside;

      // Colors
      float parity = mod(idx, 2.0);
      vec3 hiColor = mix(uCol1, uCol2, parity);

      // Glow (only outside)
      float glowRay  = exp(-10.0 * abs(distRay)) * uGlowStr * outside;
      float glowRing = exp(-10.0 * distRing)     * uGlowStr * outside;

      // Compose
      vec3 col = uBg;
      col += uGlow * (glowRay + glowRing) * 0.6;
      float highlight = max(rayMask, ringMask);
      col = mix(col, hiColor, highlight);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  return (
    <mesh ref={ref} rotation={rotation} position={position} receiveShadow>
      <circleGeometry args={[radius, 128]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
});

export default KletkaFloor;
