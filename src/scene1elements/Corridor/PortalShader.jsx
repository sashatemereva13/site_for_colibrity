// src/scene1elements/PortalShader.jsx
// TV-static portal: solid circular surface (no center hole by default)

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

const TUNE = {
  // portal shape
  radius: 4.0,
  segments: 96,

  // optional inner cutout (0 = no hole)
  innerCut: 0.0, // set > 0 to create a donut hole
  innerSoftness: 0.0, // 0..0.5 (feather at inner edge)

  // static look
  grainSize: 220.0,
  speed: 3.0,
  saturation: 0.3,
  contrast: 0.6,
  brightness: 1.0,

  // edge feather
  edgeSoftness: 0.5, // 0..~0.6 (soft rim)

  // subtle glow
  vignetteBoost: 0.15,

  // blending
  toneMapped: false,
  blending: "normal", // "additive" or "normal"
};

export default function PortalSurface({ position = [0, 0, 0] }) {
  const matRef = useRef();
  const time = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrain: { value: TUNE.grainSize },
      uSpeed: { value: TUNE.speed },
      uSaturation: { value: TUNE.saturation },
      uContrast: { value: TUNE.contrast },
      uBrightness: { value: TUNE.brightness },
      uEdgeSoft: { value: TUNE.edgeSoftness },
      uVignette: { value: TUNE.vignetteBoost },
      uRadius: { value: TUNE.radius },
      uInner: { value: TUNE.innerCut },
      uInnerSoft: { value: TUNE.innerSoftness },
    }),
    []
  );

  useFrame((_, dt) => {
    time.current += dt;
    if (matRef.current) matRef.current.uniforms.uTime.value = time.current;
  });

  const vertexShader = /* glsl */ `
    varying vec2 vUv;
    varying vec2 vPos; // local XY

    void main() {
      vUv = uv;
      vPos = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    varying vec2 vUv;
    varying vec2 vPos;

    uniform float uTime;
    uniform float uGrain;
    uniform float uSpeed;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uBrightness;
    uniform float uEdgeSoft;
    uniform float uVignette;
    uniform float uRadius;
    uniform float uInner;
    uniform float uInnerSoft;

    float hash21(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    vec3 hashRGB(vec2 p){
      float r = hash21(p + 0.13);
      float g = hash21(p * 1.37 + 7.77);
      float b = hash21(p * 1.57 + 3.31);
      return vec3(r, g, b);
    }
    vec3 applyCB(vec3 c, float contrast, float brightness){
      c = (c - 0.5) * contrast + 0.5;
      return c * brightness;
    }
    vec3 toSaturated(vec3 c, float sat){
      float g = dot(c, vec3(0.299, 0.587, 0.114));
      return mix(vec3(g), c, sat);
    }

    void main(){
      float r = length(vPos);

      // Outer rim feather (fade near uRadius)
      float outer0 = uRadius * max(0.0, 1.0 - uEdgeSoft);
      float outer1 = uRadius;
      float outerEdge = smoothstep(outer0, outer1, r); // 0 center -> 1 rim
      float outerMask = 1.0 - outerEdge;               // 1 inside -> 0 rim

      // Optional inner cut (kept 0 for solid center)
      float innerMask = 1.0;
      if (uInner > 0.0) {
        float inner0 = max(0.0, uInner);
        float inner1 = inner0 * (1.0 + clamp(uInnerSoft, 0.0, 0.5));
        innerMask = smoothstep(inner0, inner1, r); // 0 inside hole -> 1 solid
      }

      float alpha = outerMask * innerMask;
      if (alpha <= 0.001) discard;

      // Grain cells
      vec2 grid = vUv * uGrain;

      // TV flicker (integer time steps)
      float t = floor(uTime * uSpeed);
      grid += vec2(t * 17.0, t * 9.0);

      vec3 col = hashRGB(floor(grid));

      // Inner lift
      float vign = 1.0 - smoothstep(0.0, uRadius, r);
      col += uVignette * vign;

      col = toSaturated(col, uSaturation);
      col = applyCB(col, uContrast, uBrightness);

      gl_FragColor = vec4(col, alpha);
    }
  `;

  const blendingMode =
    TUNE.blending === "normal" ? THREE.NormalBlending : THREE.AdditiveBlending;

  return (
    <mesh position={position} rotation={[0, 0, 0]} frustumCulled={false}>
      <circleGeometry args={[TUNE.radius, TUNE.segments]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest
        blending={blendingMode}
        toneMapped={TUNE.toneMapped}
      />
    </mesh>
  );
}
